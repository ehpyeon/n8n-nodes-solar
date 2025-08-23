// Custom LangChain Embeddings implementation for Upstage Solar
import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';

interface UpstageEmbeddingsParams extends EmbeddingsParams {
	apiKey: string;
	model: string;
	baseURL?: string;
	batchSize?: number;
	stripNewLines?: boolean;
}

export class UpstageEmbeddings extends Embeddings {
	public apiKey: string;
	public model: string;
	public baseURL: string;
	public batchSize: number;
	public stripNewLines: boolean;

	constructor(fields: UpstageEmbeddingsParams) {
		const { apiKey, model, baseURL, batchSize, stripNewLines, ...rest } = fields;
		super(rest);

		this.apiKey = apiKey;
		this.model = model;
		this.baseURL = baseURL ?? 'https://api.upstage.ai/v1';
		this.batchSize = batchSize ?? 100; // Upstage API limit
		this.stripNewLines = stripNewLines ?? true; // LangChain default

		// Log constructor call for debugging
		console.log('UpstageEmbeddings Constructor:', {
			model: this.model,
			baseURL: this.baseURL,
			batchSize: this.batchSize,
		});
	}

	/**
	 * Embed documents (batch processing)
	 */
	async embedDocuments(texts: string[]): Promise<number[][]> {
		console.log(`UpstageEmbeddings.embedDocuments called with ${texts.length} texts`);

		// Preprocess texts (strip newlines if enabled)
		const processedTexts = this.stripNewLines
			? texts.map((text) => text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
			: texts;

		// Process in batches to respect API limits
		const results: number[][] = [];
		for (let i = 0; i < processedTexts.length; i += this.batchSize) {
			const batch = processedTexts.slice(i, i + this.batchSize);
			const batchResults = await this.callUpstageAPI(batch);
			results.push(...batchResults);
		}

		return results;
	}

	/**
	 * Embed a single query
	 */
	async embedQuery(text: string): Promise<number[]> {
		console.log(`UpstageEmbeddings.embedQuery called with text: ${text?.substring(0, 50)}...`);

		// Preprocess text
		const processedText = this.stripNewLines
			? text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
			: text;

		const result = await this.callUpstageAPI([processedText]);
		return result[0];
	}

	private async callUpstageAPI(input: string[]): Promise<number[][]> {
		try {
			// Validate and clean input
			const cleanInput = input
				.filter((text) => text && typeof text === 'string' && text.trim().length > 0)
				.map((text) => text.trim());

			if (cleanInput.length === 0) {
				throw new Error('No valid input texts provided for embedding');
			}

			// Check individual text length (Upstage limit: 4000 tokens per text)
			for (const text of cleanInput) {
				if (text.length > 16000) {
					// Rough estimate: ~4 chars per token
					console.warn(
						`Text length ${text.length} might exceed token limit:`,
						text.substring(0, 100) + '...',
					);
				}
			}

			// Check batch size (Upstage limit: 100 strings)
			if (cleanInput.length > 100) {
				throw new Error(
					`Too many texts: ${cleanInput.length}. Upstage API supports max 100 strings per request`,
				);
			}

			// Use single string for single input, array for multiple
			const requestBody = {
				model: this.model,
				input: cleanInput.length === 1 ? cleanInput[0] : cleanInput,
			};

			// Debug logging
			console.log('Upstage Embeddings Request:', {
				url: `${this.baseURL}/embeddings`,
				model: this.model,
				inputCount: cleanInput.length,
				inputSample: cleanInput[0]?.substring(0, 100) + (cleanInput[0]?.length > 100 ? '...' : ''),
			});

			const response = await fetch(`${this.baseURL}/embeddings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				console.error('Upstage API Error Response:', errorBody);
				console.error('Request Body:', JSON.stringify(requestBody, null, 2));
				throw new Error(`Upstage API error: ${response.status} - ${errorBody}`);
			}

			const data: any = await response.json();
			console.log('Upstage API Success Response:', {
				model: data.model,
				usage: data.usage,
				dataCount: data.data?.length,
			});

			if (!data.data || !Array.isArray(data.data)) {
				throw new Error('Invalid response format from Upstage API');
			}

			// Sort by index to ensure correct order
			const sortedData = data.data.sort((a: any, b: any) => a.index - b.index);

			// Ensure we return the same number of embeddings as input texts
			if (sortedData.length !== cleanInput.length) {
				throw new Error(`Expected ${cleanInput.length} embeddings, got ${sortedData.length}`);
			}

			return sortedData.map((item: any) => item.embedding);
		} catch (error) {
			throw new Error(
				`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
