import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { ChatOpenAI } from '@langchain/openai';

export class LmChatUpstage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Solar Chat Model',
		name: 'lmChatUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Solar Chat Model',
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
				options: [
					{
						name: 'solar-mini',
						value: 'solar-mini',
						description: 'Fast and efficient model for basic tasks',
					},
					{
						name: 'solar-pro',
						value: 'solar-pro',
						description: 'Powerful model for complex tasks',
					},
					{
						name: 'solar-pro2',
						value: 'solar-pro2',
						description: 'Latest and most advanced Solar model',
					},
				],
				default: 'solar-mini',
				description: 'The Solar model to use',
			},
			{
				displayName: 'Messages',
				name: 'messages',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add message',
				options: [
					{
						displayName: 'Message',
						name: 'message',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{
										name: 'System',
										value: 'system',
									},
									{
										name: 'User',
										value: 'user',
									},
									{
										name: 'Assistant',
										value: 'assistant',
									},
								],
								default: 'user',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								typeOptions: {
									rows: 2,
								},
								default: '',
								description: 'Message content',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						description: 'Controls randomness in output. Higher values make output more random.',
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1000,
						typeOptions: {
							minValue: 1,
							maxValue: 4000,
						},
						description: 'Maximum number of tokens to generate',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 0.9,
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						description: 'Nucleus sampling parameter',
					},
					{
						displayName: 'Stream',
						name: 'stream',
						type: 'boolean',
						default: false,
						description: 'Whether to stream the response',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoning_effort',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
								description: 'Disable reasoning for faster responses',
							},
							{
								name: 'High',
								value: 'high',
								description: 'Enable reasoning for complex tasks (may increase token usage)',
							},
						],
						default: 'low',
						description: 'Controls the level of reasoning effort. Only applicable to Reasoning models.',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequency_penalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: 'Controls model tendency to repeat tokens. Positive values reduce repetition, negative values allow more repetition.',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presence_penalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 2,
						},
						description: 'Adjusts tendency to include tokens already present. Positive values encourage new ideas, negative values maintain consistency.',
					},
					{
						displayName: 'Response Format',
						name: 'response_format',
						type: 'options',
						options: [
							{
								name: 'Text (Default)',
								value: 'text',
								description: 'Standard text response',
							},
							{
								name: 'JSON Object',
								value: 'json_object',
								description: 'Generate JSON object (requires "JSON" in prompt)',
							},
							{
								name: 'JSON Schema',
								value: 'json_schema',
								description: 'Generate JSON with custom schema (structured outputs)',
							},
						],
						default: 'text',
						description: 'Format for model output. JSON formats only work with solar-pro2 model.',
					},
					{
						displayName: 'JSON Schema',
						name: 'json_schema',
						type: 'json',
						displayOptions: {
							show: {
								response_format: ['json_schema'],
							},
						},
						default: '{}',
						description: 'JSON schema for structured outputs when using json_schema format',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const model = this.getNodeParameter('model', itemIndex) as string;
		const messagesCollection = this.getNodeParameter('messages.message', itemIndex, []) as Array<{
			role: string;
			content: string;
		}>;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			max_tokens?: number;
			top_p?: number;
			stream?: boolean;
			reasoning_effort?: string;
			frequency_penalty?: number;
			presence_penalty?: number;
			response_format?: string;
			json_schema?: string;
		};

		// Get Upstage API credentials
		const credentials = await this.getCredentials('upstageApi');
		const apiKey = credentials.apiKey as string;

		// Initialize ChatOpenAI with Upstage configuration
		const chatModel = new ChatOpenAI({
			modelName: model,
			openAIApiKey: apiKey,
			configuration: {
				baseURL: 'https://api.upstage.ai/v1/solar',
			},
			temperature: options.temperature,
			maxTokens: options.max_tokens,
			topP: options.top_p,
			frequencyPenalty: options.frequency_penalty,
			presencePenalty: options.presence_penalty,
		});

		return {
			response: chatModel,
		};
	}
}
