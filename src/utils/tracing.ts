import type { ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Creates N8nLlmTracing using n8n's internal modules when available
 * Falls back to basic implementation for community nodes
 */
export function createN8nLlmTracing(
	context: ISupplyDataFunctions,
	options: { tokensUsageParser?: (llmOutput: any) => any } = {}
) {
	try {
		// Try to use n8n's internal N8nLlmTracing (available when installed in n8n core)
		const { N8nLlmTracing } = require('../N8nLlmTracing');
		return new N8nLlmTracing(context, options);
	} catch (error) {
		// Fallback: return null to indicate no tracing available
		// This allows the calling code to handle gracefully
		return null;
	}
}

/**
 * Creates failure attempt handler using n8n's internal modules when available
 */
export function createN8nLlmFailedAttemptHandler(context: ISupplyDataFunctions) {
	try {
		// Try to use n8n's internal failure handler
		const { makeN8nLlmFailedAttemptHandler } = require('../n8nLlmFailedAttemptHandler');
		return makeN8nLlmFailedAttemptHandler(context);
	} catch (error) {
		// Fallback: return undefined to indicate no handler available
		return undefined;
	}
}

/**
 * Gets HTTP proxy agent using n8n's internal utilities when available
 */
export function getHttpProxyAgent() {
	try {
		// Try to use n8n's internal getHttpProxyAgent
		const { getHttpProxyAgent } = require('@utils/httpProxyAgent');
		return getHttpProxyAgent();
	} catch (error) {
		// Fallback: return undefined (no proxy)
		return undefined;
	}
}

/**
 * Gets connection hint notice field using n8n's internal utilities when available
 */
export function getConnectionHintNoticeField(connectionTypes: any[]) {
	try {
		// Try to use n8n's internal getConnectionHintNoticeField
		const { getConnectionHintNoticeField } = require('@utils/sharedFields');
		return getConnectionHintNoticeField(connectionTypes);
	} catch (error) {
		// Fallback: return null (no hint field)
		return null;
	}
}