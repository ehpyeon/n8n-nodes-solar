import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class LmChatUpstage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upstage Solar LLM',
		name: 'lmChatUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['transform', '@n8n/n8n-nodes-langchain'],
		version: 1,
		description: 'Use Upstage Solar models for chat completions',
		defaults: {
			name: 'Upstage Solar LLM',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const model = this.getNodeParameter('model', i) as string;
				const messages = this.getNodeParameter('messages.message', i, []) as Array<{
					role: string;
					content: string;
				}>;
				const options = this.getNodeParameter('options', i, {}) as {
					temperature?: number;
					max_tokens?: number;
					top_p?: number;
					stream?: boolean;
				};

				// Build request body
				const requestBody: any = {
					model,
					messages,
					...options,
				};

				// Make API request
				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: 'https://api.upstage.ai/v1/solar/chat/completions',
					body: requestBody,
					json: true,
				};

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'upstageApi',
					requestOptions,
				);

				// Handle streaming vs non-streaming response
				if (options.stream) {
					// For streaming, we'd need to handle the stream properly
					// For now, return the full response
					returnData.push({
						json: response,
						pairedItem: { item: i },
					});
				} else {
					// Extract the assistant's message
					const choice = response.choices?.[0];
					const content = choice?.message?.content || '';
					
					returnData.push({
						json: {
							content,
							usage: response.usage,
							model: response.model,
							created: response.created,
							full_response: response,
						},
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message || 'Unknown error' },
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
