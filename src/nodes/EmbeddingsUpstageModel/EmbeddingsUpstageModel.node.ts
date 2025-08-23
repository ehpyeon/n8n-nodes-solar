import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import type { Embeddings } from '@langchain/core/embeddings';

export class EmbeddingsUpstageModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upstage Embeddings Model',
		name: 'embeddingsUpstageModel',
		icon: 'file:upstage_v2.svg',
		group: ['@n8n/n8n-nodes-langchain'],
		version: 1,
			description: 'Embedding Model for Vector DB - Upstage Solar Embeddings. Supports up to 100 strings per request with max 204,800 total tokens. Each text should be under 4000 tokens (optimal: under 512 tokens).',
		defaults: {
			name: 'Upstage Embeddings Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://js.langchain.com/docs/modules/data_connection/text_embedding/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Embeddings'],
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
				description: 'The Upstage embedding model to use',
				default: 'embedding-query',
				options: [
					{
						name: 'Embedding Query',
						value: 'embedding-query',
						description: 'Optimized for search queries and questions',
					},
					{
						name: 'Embedding Passage',
						value: 'embedding-passage',
						description: 'Optimized for documents and passages',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('upstageApi');
		const model = this.getNodeParameter('model', itemIndex) as string;

		// Create a custom embedding model that implements LangChain's interface
		const embeddingModel = new UpstageEmbeddings({
			apiKey: credentials.apiKey as string,
			model,
		});

		return {
			response: embeddingModel,
		};
	}
}

// Custom LangChain Embeddings implementation for Upstage Solar
import { OpenAIEmbeddings } from '@langchain/openai';

class UpstageEmbeddings extends OpenAIEmbeddings {
	constructor(fields: {
		apiKey: string;
		model: string;
	}) {
		super({
			openAIApiKey: fields.apiKey,
			modelName: fields.model,
			configuration: {
				baseURL: 'https://api.upstage.ai/v1',
			},
		});
	}
}
