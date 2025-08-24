import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { getHttpProxyAgent } from 'n8n-core';
import { N8nLlmTracing, makeN8nLlmFailedAttemptHandler } from 'n8n-nodes-base/dist/llms/helpers';
import { getConnectionHintNoticeField } from 'n8n-nodes-base/dist/utils/ConnectionHintNotice';

export class LmChatUpstage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upstage Solar Chat Model (Advanced)',
		name: 'lmChatUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model for AI Agent - Upstage Solar LLM (Advanced usage)',
		defaults: {
			name: 'Upstage Solar Chat Model (Advanced)',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatupstage/',
					},
				],
			},
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: 'https://api.upstage.ai/v1',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'upstageApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
					loadOptionsDependsOn: ['upstageApi'],
				},
				default: '',
				description: 'The Upstage Solar model to use',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to configure',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: 1000,
						typeOptions: { minValue: 1, maxValue: 4000 },
						description: 'Maximum number of tokens to generate',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
						description: 'Controls randomness. Higher values make output more random.',
						type: 'number',
					},
					{
						displayName: 'Streaming',
						name: 'streaming',
						default: false,
						description: 'Whether to stream the response',
						type: 'boolean',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ISupplyDataFunctions) {
				const credentials = await this.getCredentials('upstageApi');
				const response = await this.helpers.request({
					url: '/models',
					method: 'GET',
					qs: {},
					headers: {
						Authorization: `Bearer ${credentials.apiKey}`,
					},
					baseURL: 'https://api.upstage.ai/v1',
					json: true,
				});
				if (!response || !Array.isArray(response.models)) {
					return [];
				}
				const models = response.models as Array<{ id: string; name: string; description: string }>;
				// Sort models alphabetically by name
				models.sort((a, b) => a.name.localeCompare(b.name));
				return models.map((model) => ({
					name: model.name,
					value: model.id,
					description: model.description,
				}));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('upstageApi');

		let modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokens?: number;
			temperature?: number;
			streaming?: boolean;
		};

		if (!modelName) {
			// fallback: fetch models and pick first one
			const response = await this.helpers.request({
				url: '/models',
				method: 'GET',
				headers: {
					Authorization: `Bearer ${credentials.apiKey}`,
				},
				baseURL: 'https://api.upstage.ai/v1',
				json: true,
			});
			if (response && Array.isArray(response.models) && response.models.length > 0) {
				modelName = response.models[0].id;
			} else {
				throw new Error('No Upstage Solar models available');
			}
		}

		const modelKwargs = {};

		const configuration = {
			baseURL: 'https://api.upstage.ai/v1/solar',
			httpAgent: getHttpProxyAgent(),
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
		};

		const upstageTokensParser = (response: any) => {
			const usage = response?.usage;
			if (usage) {
				const promptTokens = usage.prompt_tokens;
				const completionTokens = usage.completion_tokens;
				const totalTokens = usage.total_tokens;
				this.logger?.info(
					`Upstage tokens usage - prompt: ${promptTokens}, completion: ${completionTokens}, total: ${totalTokens}`,
				);
				return { promptTokens, completionTokens, totalTokens };
			}
			return undefined;
		};

		const model = new ChatOpenAI({
			openAIApiKey: credentials.apiKey as string,
			modelName,
			configuration,
			callbacks: [new N8nLlmTracing(this, { tokensUsageParser: upstageTokensParser })],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
			maxTokens: options.maxTokens,
			temperature: options.temperature,
			streaming: options.streaming || false,
		});

		return {
			response: model,
		};
	}
}
