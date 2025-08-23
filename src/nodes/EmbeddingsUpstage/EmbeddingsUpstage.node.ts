import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
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
		displayName: 'Solar Embeddings Model',
		name: 'embeddingsUpstage',
		icon: 'file:upstage_v2.svg',
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Solar Embeddings Model',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Model'],
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('upstageApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			stripNewLines?: boolean;
			showUsage?: boolean;
		};

		// Create UpstageEmbeddings instance
		const embeddings = new UpstageEmbeddings({
			apiKey: credentials.apiKey as string,
			model,
			baseURL: 'https://api.upstage.ai/v1',
			batchSize: options.batchSize,
			stripNewLines: options.stripNewLines,
		});

		return {
			response: embeddings,
		};
	}
}
