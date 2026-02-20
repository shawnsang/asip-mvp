/**
 * Agents Index
 * Agent 模块导出
 */

// Types
export * from './types';

// Base
export { BaseAgentClass, AgentFactory } from './base-agent';

// Agents
export { orchestrationAgent, OrchestrationAgent } from './orchestration-agent';
export { trendFinderAgent, TrendFinderAgent } from './trend-finder';
export { sourceCollectorAgent, SourceCollectorAgent } from './source-collector';
export { sceneTranslatorAgent, SceneTranslatorAgent } from './scene-translator';
export { insightSummarizerAgent, InsightSummarizerAgent } from './insight-summarizer';
export { salesScriptGeneratorAgent, SalesScriptGeneratorAgent } from './sales-generator';
export { valuePropositionAgent, ValuePropositionAgent } from './value-proposition';

// Convenience functions to run flows
export { runBrainstormFlow, runSalesScriptFlow } from './workflows';

// Data ingestion
export { dataIngestionAgent, DataIngestionAgent, getKnowledgeGraph, addToKnowledgeGraph } from './data-ingestion';

// Async task management
export { createTask, getTask, updateTask } from './async-task';
