import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';

export class LmChatUpstage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upstage Solar Chat Model (Advanced)',
		name: 'lmChatUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['@n8n/n8n-nodes-langchain'],
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
						url: 'https://js.langchain.com/docs/modules/model_io/models/chat/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'upstageApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description: 'The Upstage Solar model to use',
				default: 'solar-mini',
				options: [
					{
						name: 'Solar Mini',
						value: 'solar-mini',
						description: 'Fast and efficient model for basic tasks',
					},
					{
						name: 'Solar Pro',
						value: 'solar-pro',
						description: 'Powerful model for complex tasks',
					},
					{
						name: 'Solar Pro 2',
						value: 'solar-pro2',
						description: 'Latest and most advanced Solar model',
					},
				],
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('upstageApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokens?: number;
			temperature?: number;
			streaming?: boolean;
		};

		// Create a custom chat model that implements LangChain's interface
		const chatModel = new UpstageChat({
			apiKey: credentials.apiKey as string,
			model,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			streaming: options.streaming,
			executeFunctions: this, // Pass executeFunctions for N8n tracing
		});

		return {
			response: chatModel,
		};
	}
}

// Custom LangChain Chat Model implementation for Upstage Solar with N8n Tracing
class UpstageChat extends ChatOpenAI {
	constructor(fields: {
		apiKey: string;
		model: string;
		temperature?: number;
		maxTokens?: number;
		streaming?: boolean;
		executeFunctions?: ISupplyDataFunctions;
	}) {
		// Custom token parser for Upstage API response format
		const upstageTokensParser = (response: any) => {
			const usage = response?.usage;
			if (usage) {
				return {
					totalTokens: usage.total_tokens,
					promptTokens: usage.prompt_tokens,
					completionTokens: usage.completion_tokens,
				};
			}
			return undefined;
		};

		// Prepare callbacks for N8n tracing
		const callbacks = [];
		if (fields.executeFunctions) {
			try {
				// Try to create N8nLlmTracing callback if available
				const { N8nLlmTracing } = require('@n8n/n8n-nodes-langchain/dist/utils/N8nLlmTracing');
				callbacks.push(new N8nLlmTracing(fields.executeFunctions, upstageTokensParser));
			} catch (error) {
				// Fallback: create a simple logging callback
				callbacks.push({
					handleLLMStart: async (llm: any, prompts: string[]) => {
						console.log('Solar LLM Start:', { model: fields.model, prompts });
					},
					handleLLMEnd: async (output: any) => {
						const tokens = upstageTokensParser(output);
						console.log('Solar LLM End:', { tokens, output });
					},
					handleLLMError: async (error: Error) => {
						console.error('Solar LLM Error:', error);
					},
				});
			}
		}

		super({
			openAIApiKey: fields.apiKey,
			modelName: fields.model,
			temperature: fields.temperature,
			maxTokens: fields.maxTokens,
			streaming: fields.streaming || false,
			configuration: {
				baseURL: 'https://api.upstage.ai/v1/solar',
			},
			callbacks: callbacks.length > 0 ? callbacks : undefined,
		});
	}
}
