# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-01-23

### Fixed
- **AI Agent Compatibility**: Fixed visual call tracking in n8n AI Agent workflows
- Converted Solar LLM and Embeddings nodes to use `supplyData` instead of `execute` method
- Updated connection types to use AI node types (`AiLanguageModel`, `AiEmbedding`)
- Restored visual invocation logs in n8n UI that were missing since LangChain compliance changes

### Changed
- Node display names updated to "Solar Chat Model" and "Solar Embeddings Model"
- Simplified node configuration for better AI agent integration
- Removed custom n8n tracing integration that was incompatible with AI agent framework

### Technical Details
- Replaced `IExecuteFunctions` with `ISupplyDataFunctions`
- Updated imports to use `NodeConnectionType` instead of `NodeConnectionTypes`
- Maintained LangChain compatibility while ensuring n8n AI Agent integration

## [0.2.0] - 2024-12-XX

### Added
- Enhanced UpstageEmbeddings class with improved logging and error handling
- Custom token usage tracking for Upstage API responses
- Comprehensive AI event logging for embedding operations

### Fixed
- Token usage parsing for Upstage API format
- Event logging integration with n8n logging system

## [0.1.0] - 2024-11-XX

### Added
- Initial release of Solar LLM and Embeddings nodes for n8n
- Support for Solar models (solar-mini, solar-pro, solar-pro2)
- Upstage API integration
- Basic embedding functionality
- Credential management for Upstage API
