import type { ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Conditional N8nLlmTracing wrapper for community nodes
 * This tries to use N8nLlmTracing if available (in n8n core environment),
 * otherwise falls back to a simple callback that logs token usage
 */
export function createN8nLlmTracing(
	context: ISupplyDataFunctions,
	options: { tokensUsageParser?: (llmOutput: any) => any } = {}
) {
	try {
		// Try to dynamically import N8nLlmTracing if available
		// This will work in n8n core but fail in community node environments
		const N8nLlmTracing = require('n8n-core/dist/CallbackManagers/N8nLlmTracing').N8nLlmTracing;
		return new N8nLlmTracing(context, options);
	} catch (error) {
		// Fallback: Create a minimal callback for token usage logging
		return {
			handleLLMStart: () => {},
			handleLLMEnd: (output: any) => {
				if (options.tokensUsageParser) {
					const usage = options.tokensUsageParser(output);
					console.log('🔍 Solar LLM Usage (Community Node):', usage);
				}
			},
			handleLLMError: (error: Error) => {
				console.error('🚫 Solar LLM Error:', error);
			},
		};
	}
}

/**
 * Conditional failure attempt handler
 */
export function createN8nLlmFailedAttemptHandler(context: ISupplyDataFunctions) {
	try {
		// Try to use the n8n core handler if available
		const handler = require('n8n-core/dist/CallbackManagers/n8nLlmFailedAttemptHandler')
			.makeN8nLlmFailedAttemptHandler;
		return handler(context);
	} catch (error) {
		// Fallback: Simple retry handler
		return (error: any, attemptNumber: number) => {
			console.warn(`🔄 Solar LLM Retry attempt ${attemptNumber}:`, error.message);
			// Simple exponential backoff
			return Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
		};
	}
}