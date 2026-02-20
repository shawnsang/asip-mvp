/**
 * Agent Base Types and Framework
 * 基础 Agent 类型定义和框架
 */

/**
 * Agent 执行上下文
 */
export interface AgentContext {
  userId?: string;
  sessionId?: string;
  conversationHistory: ConversationMessage[];
  metadata?: Record<string, any>;
}

/**
 * 对话消息
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Agent 输入
 */
export interface AgentInput {
  task: string;
  context?: AgentContext;
  params?: Record<string, any>;
}

/**
 * Agent 输出
 */
export interface AgentOutput {
  success: boolean;
  data: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent 能力定义
 */
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}

/**
 * Agent 基础接口
 */
export interface BaseAgent {
  name: string;
  description: string;
  capabilities: AgentCapability[];

  /**
   * 执行任务
   */
  execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * 检查是否可以处理该任务
   */
  canHandle(task: string): boolean;
}

/**
 * 意图类型
 */
export type IntentType =
  | 'brainstorm'        // 脑力风暴 - 寻找新机会
  | 'case_search'        // 案例搜索
  | 'sales_script'      // 销售话术生成
  | 'roi_estimate'       // ROI 估算
  | 'trend_discovery'    // 趋势发现
  | 'general_chat'      // 一般对话
  | 'unknown';           // 未知意图

/**
 * 意图识别结果
 */
export interface IntentRecognitionResult {
  intent: IntentType;
  confidence: number;
  entities: Record<string, any>;
  suggestedTasks: string[];
}

/**
 * 任务结果
 */
export interface TaskResult {
  agentName: string;
  task: string;
  success: boolean;
  data: any;
  error?: string;
  duration: number;
}

/**
 * 编排结果
 */
export interface OrchestrationResult {
  success: boolean;
  intent: IntentRecognitionResult;
  tasks: TaskResult[];
  finalOutput: string;
  metadata: Record<string, any>;
}
