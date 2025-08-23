import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { UpstageEmbeddings } from './UpstageEmbeddings';

const modelParameter: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	description:
		'The model which will generate the embeddings. <a href="https://console.upstage.ai/docs/capabilities/embeddings">Learn more</a>.',
	options: [
		{
			name: 'Embedding Query (Alias)',
			value: 'embedding-query',
			description: 'Optimized for search queries - points to latest query model',
		},
		{
			name: 'Embedding Passage (Alias)',
			value: 'embedding-passage',
			description: 'Optimized for document passages - points to latest passage model',
		},
		{
			name: 'Solar Embedding 1 Large Query',
			value: 'solar-embedding-1-large-query',
			description: 'Specific version for query embeddings',
		},
		{
			name: 'Solar Embedding 1 Large Passage',
			value: 'solar-embedding-1-large-passage',
			description: 'Specific version for passage embeddings',
		},
	],
	default: 'embedding-query',
	hint: 'Use aliases (embedding-query/embedding-passage) to automatically benefit from future model updates',
};

export class EmbeddingsUpstage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Upstage',
		name: 'embeddingsUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Upstage Solar Embeddings for text vectorization with enhanced input validation and error handling',
		defaults: {
			name: 'Embeddings Upstage',
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
			modelParameter,
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Single Text',
						value: 'single',
						description: 'Process a single text input',
					},
					{
						name: 'Array of Texts',
						value: 'array',
						description: 'Process multiple texts at once',
					},
					{
						name: 'LangChain Compatible',
						value: 'langchain',
						description: 'Use LangChain-compatible embeddings interface',
					},
				],
				default: 'single',
				description: 'How to handle the input data',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['single'],
					},
				},
				default: '',
				placeholder: 'Enter text to embed',
				description: 'The text to generate embeddings for',
			},
			{
				displayName: 'Texts',
				name: 'texts',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['array'],
					},
				},
				typeOptions: {
					rows: 5,
				},
				default: '',
				placeholder: 'Enter texts separated by newlines',
				description: 'Multiple texts to generate embeddings for (one per line). Max 100 texts, total 204,800 tokens. Each text max 4000 tokens.',
			},
			{
				displayName: 'Text Field',
				name: 'textField',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['single'],
					},
				},
				default: '',
				placeholder: 'Optional: field name containing text',
				description: 'Field name from input data containing the text to embed (if empty, uses the "text" parameter above)',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						default: 100,
						typeOptions: { maxValue: 100 },
						description:
							'Maximum number of documents to send in each request. Upstage supports up to 100 texts per batch.',
						type: 'number',
					},
					{
						displayName: 'Strip New Lines',
						name: 'stripNewLines',
						default: true,
						description: 'Whether to strip new lines from the input text',
						type: 'boolean',
					},
					{
						displayName: 'Show Usage',
						name: 'showUsage',
						default: false,
						description: 'Whether to include token usage information in the response',
						type: 'boolean',
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
				const credentials = await this.getCredentials('upstageApi');
				const model = this.getNodeParameter('model', i) as string;
				const inputType = this.getNodeParameter('inputType', i) as string;
				const textField = this.getNodeParameter('textField', i, '') as string;
				const options = this.getNodeParameter('options', i, {}) as {
					batchSize?: number;
					stripNewLines?: boolean;
					showUsage?: boolean;
				};

				// Handle LangChain compatible mode
				if (inputType === 'langchain') {
					// Create UpstageEmbeddings instance for LangChain compatibility
					const embeddings = new UpstageEmbeddings({
						apiKey: credentials.apiKey as string,
						model,
						baseURL: 'https://api.upstage.ai/v1',
						batchSize: options.batchSize,
						stripNewLines: options.stripNewLines,
					});

					returnData.push({
						json: {
							embeddingsInstance: embeddings,
							message: 'LangChain-compatible UpstageEmbeddings instance created',
							model,
							options,
						},
						pairedItem: { item: i },
					});
					continue;
				}

				let input: string | string[];

				if (inputType === 'single') {
					if (textField && items[i].json[textField]) {
						// Get text from input data field
						input = items[i].json[textField] as string;
					} else {
						// Get text from parameter
						input = this.getNodeParameter('text', i) as string;
					}
				} else {
					// Array input
					const textsParam = this.getNodeParameter('texts', i) as string;
					input = textsParam.split('\n').filter(text => text.trim().length > 0);
				}

				if (!input || (Array.isArray(input) && input.length === 0)) {
					throw new Error('No input text provided');
				}

				// Use enhanced UpstageEmbeddings for processing
				const embeddings = new UpstageEmbeddings({
					apiKey: credentials.apiKey as string,
					model,
					baseURL: 'https://api.upstage.ai/v1',
					batchSize: options.batchSize,
					stripNewLines: options.stripNewLines,
				});

				let result: number[] | number[][];
				let usage: any = {};

				if (Array.isArray(input)) {
					// Multiple embeddings
					result = await embeddings.embedDocuments(input);
					const embeddingsData = result.map((embedding, index) => ({
						text: input[index],
						embedding,
						index,
						dimension: embedding.length,
					}));

					returnData.push({
						json: {
							embeddings: embeddingsData,
							model,
							usage: options.showUsage ? usage : undefined,
							count: embeddingsData.length,
						},
						pairedItem: { item: i },
					});
				} else {
					// Single embedding
					result = await embeddings.embedQuery(input);
					returnData.push({
						json: {
							text: input,
							embedding: result,
							model,
							usage: options.showUsage ? usage : undefined,
							dimension: result.length,
						},
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				console.error('EmbeddingsUpstage execution error:', error);
				if (this.continueOnFail()) {
					returnData.push({
						json: { 
							error: (error as Error).message || 'Unknown error',
							errorDetails: error instanceof Error ? error.stack : String(error),
						},
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
