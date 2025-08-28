import type { ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Creates N8nLlmTracing callback for proper n8n execution logging
 * This follows the same pattern as the reference implementation
 */
export function createN8nLlmTracing(
	context: ISupplyDataFunctions,
	options: { tokensUsageParser?: (llmOutput: any) => any } = {}
) {
	try {
		// First attempt: Try to import from n8n-core (for full n8n installations)
		try {
			const { N8nLlmTracing } = require('n8n-core/dist/CallbackManagers/N8nLlmTracing');
			return new N8nLlmTracing(context, options);
		} catch (coreError) {
			// Second attempt: Try different path structures
			const n8nCore = require('n8n-core');
			if (n8nCore.N8nLlmTracing) {
				return new n8nCore.N8nLlmTracing(context, options);
			}
		}
	} catch (importError) {
		// If n8n-core is not available, create a callback that integrates with n8n's logging
		console.log('🔍 Using fallback N8nLlmTracing implementation for community node');
	}

	// Fallback implementation that tries to integrate with n8n's execution context
	return {
		name: 'N8nLlmTracing',
		
		handleLLMStart: async (llm: any, prompts: string[], runId: string, parentRunId?: string) => {
			// Log start with n8n context
			const workflow = (context as any).getWorkflow?.();
			const node = (context as any).getNode?.();
			const executionId = (context as any).getExecutionId?.();
			
			console.log('🚀 Solar LLM Start:', {
				runId,
				parentRunId,
				executionId,
				workflow: workflow?.name,
				node: node?.name,
				prompts: prompts.length,
				timestamp: new Date().toISOString(),
			});
		},

		handleLLMEnd: async (output: any, runId: string) => {
			// Parse token usage and log completion
			let usage = null;
			if (options.tokensUsageParser) {
				usage = options.tokensUsageParser(output);
			}

			const workflow = (context as any).getWorkflow?.();
			const node = (context as any).getNode?.();
			const executionId = (context as any).getExecutionId?.();

			console.log('✅ Solar LLM End:', {
				runId,
				executionId,
				workflow: workflow?.name,
				node: node?.name,
				usage,
				timestamp: new Date().toISOString(),
			});

			// Try to log to n8n's execution context if available
			try {
				if ((context as any).logger) {
					(context as any).logger.debug('Solar LLM execution completed', {
						usage,
						runId,
						executionId,
					});
				}
			} catch (error) {
				// Silent fail if logger not available
			}
		},

		handleLLMError: async (error: Error, runId: string) => {
			const workflow = (context as any).getWorkflow?.();
			const node = (context as any).getNode?.();
			const executionId = (context as any).getExecutionId?.();

			console.error('🚫 Solar LLM Error:', {
				runId,
				executionId,
				workflow: workflow?.name,
				node: node?.name,
				error: error.message,
				timestamp: new Date().toISOString(),
			});

			// Try to log error to n8n's execution context if available
			try {
				if ((context as any).logger) {
					(context as any).logger.error('Solar LLM execution failed', {
						error: error.message,
						runId,
						executionId,
					});
				}
			} catch (logError) {
				// Silent fail if logger not available
			}
		},
	};
}

/**
 * Creates failure attempt handler following n8n patterns
 */
export function createN8nLlmFailedAttemptHandler(context: ISupplyDataFunctions) {
	try {
		// Try to use n8n's built-in failure handler
		const { makeN8nLlmFailedAttemptHandler } = require('n8n-core');
		return makeN8nLlmFailedAttemptHandler(context);
	} catch (error) {
		// Fallback implementation with enhanced logging
		return (error: any, attemptNumber: number) => {
			const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
			
			const workflow = (context as any).getWorkflow?.();
			const node = (context as any).getNode?.();
			const executionId = (context as any).getExecutionId?.();

			console.warn(`🔄 Solar LLM Retry attempt ${attemptNumber} after ${delay}ms:`, {
				error: error.message,
				type: error.name,
				attempt: attemptNumber,
				executionId,
				workflow: workflow?.name,
				node: node?.name,
			});

			// Try to log retry to n8n's execution context if available
			try {
				if ((context as any).logger) {
					(context as any).logger.warn(`Solar LLM retry attempt ${attemptNumber}`, {
						error: error.message,
						delay,
						executionId,
					});
				}
			} catch (logError) {
				// Silent fail if logger not available
			}

			return delay;
		};
	}
}