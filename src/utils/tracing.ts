import type { BaseCallbackConfig } from '@langchain/core/callbacks/manager';
import type { ISupplyDataFunctions } from 'n8n-workflow';

interface TracingConfig {
	additionalMetadata?: Record<string, unknown>;
	tokensUsageParser?: (llmOutput: any) => any;
}

/**
 * Get proper tracing configuration for n8n LangChain nodes
 * Uses n8n's parent callback manager for proper execution tracking
 */
export function getTracingConfig(
	context: ISupplyDataFunctions,
	config: TracingConfig = {},
): BaseCallbackConfig {
	// Try to get the parent callback manager from n8n context
	const parentRunManager = 
		(context as any).getParentCallbackManager?.() ||
		// Fallback for different n8n versions
		(context as any).getCallbackManager?.() ||
		undefined;

	// Get workflow and node information safely
	const workflow = (context as any).getWorkflow?.();
	const node = (context as any).getNode?.();
	const executionId = (context as any).getExecutionId?.();

	return {
		runName: workflow && node ? `[${workflow.name}] ${node.name}` : 'Solar Chat Model',
		metadata: {
			...(executionId && { execution_id: executionId }),
			...(workflow && { workflow: workflow }),
			...(node && { node: node.name }),
			model_type: 'solar',
			provider: 'upstage',
			...(config.additionalMetadata ?? {}),
		},
		callbacks: parentRunManager,
	};
}

/**
 * Conditional failure attempt handler for LangChain retries
 */
export function createN8nLlmFailedAttemptHandler(context: ISupplyDataFunctions) {
	try {
		// Try to use n8n's built-in failure handler
		const n8nCore = require('n8n-core');
		if (n8nCore?.makeN8nLlmFailedAttemptHandler) {
			return n8nCore.makeN8nLlmFailedAttemptHandler(context);
		}
	} catch (error) {
		// Fallback is handled below
	}

	// Fallback: Enhanced retry handler with logging
	return (error: any, attemptNumber: number) => {
		const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
		console.warn(`🔄 Solar LLM Retry attempt ${attemptNumber} after ${delay}ms:`, {
			error: error.message,
			type: error.name,
			attempt: attemptNumber,
		});
		return delay;
	};
}