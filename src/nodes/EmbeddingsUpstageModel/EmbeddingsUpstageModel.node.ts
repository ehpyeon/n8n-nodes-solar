import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

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
import { Embeddings } from '@langchain/core/embeddings';

class UpstageEmbeddings extends Embeddings {
	private apiKey: string;
	private model: string;
	private baseURL: string = 'https://api.upstage.ai/v1';

	constructor(fields: {
		apiKey: string;
		model: string;
	}) {
		super({});
		this.apiKey = fields.apiKey;
		this.model = fields.model;
	}

	async embedDocuments(texts: string[]): Promise<number[][]> {
		return this.callUpstageAPI(texts);
	}

	async embedQuery(text: string): Promise<number[]> {
		const result = await this.callUpstageAPI([text]);
		return result[0];
	}

	private async callUpstageAPI(input: string[]): Promise<number[][]> {
		try {
			const response = await fetch(`${this.baseURL}/embeddings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					model: this.model,
					input: input,
				}),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				throw new Error(`Upstage API error: ${response.status} - ${errorBody}`);
			}

			const data: any = await response.json();
			
			// Sort by index to ensure correct order
			const sortedData = data.data.sort((a: any, b: any) => a.index - b.index);
			return sortedData.map((item: any) => item.embedding);
		} catch (error) {
			throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
