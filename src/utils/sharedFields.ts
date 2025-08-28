import type { INodeProperties } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

/**
 * Get the connection hint field for a node
 */
export function getConnectionHintNoticeField(
	allowedConnectionTypes: NodeConnectionType[],
): INodeProperties {
	const connectionTypes = allowedConnectionTypes
		.map((type) => {
			switch (type) {
				case NodeConnectionType.AiAgent:
					return 'AI Agent';
				case NodeConnectionType.AiChain:
					return 'AI Chain';
				case NodeConnectionType.AiDocument:
					return 'AI Document';
				case NodeConnectionType.AiEmbedding:
					return 'AI Embedding';
				case NodeConnectionType.AiLanguageModel:
					return 'AI Language Model';
				case NodeConnectionType.AiMemory:
					return 'AI Memory';
				case NodeConnectionType.AiOutputParser:
					return 'AI Output Parser';
				case NodeConnectionType.AiRetriever:
					return 'AI Retriever';
				case NodeConnectionType.AiTextSplitter:
					return 'AI Text Splitter';
				case NodeConnectionType.AiTool:
					return 'AI Tool';
				case NodeConnectionType.AiVectorStore:
					return 'AI Vector Store';
				default:
					return type;
			}
		})
		.join(', ');

	return {
		displayName: '',
		name: 'notice',
		type: 'notice',
		default: '',
		description: `Connect this node to: ${connectionTypes}`,
	};
}