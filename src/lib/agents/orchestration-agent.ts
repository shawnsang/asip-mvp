/**
 * Orchestration Agent
 * 编排 Agent - 意图识别、任务分发、结果聚合
 */

import { BaseAgentClass } from './base-agent';
import {
  AgentInput,
  AgentOutput,
  IntentRecognitionResult,
  IntentType,
  OrchestrationResult,
  TaskResult
} from './types';
import { callQwen } from '../llm';

/**
 * 意图识别关键词
 */
const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  brainstorm: [
    '新应用方向', '新机会', '新场景', '有什么新', '创新方向',
    '脑力风暴', '灵感', '发现新', '探索新', '趋势方向',
    '最近有什么新', '新型应用', '创新案例'
  ],
  case_search: [
    '案例', '案例库', '搜索案例', '找案例', '类似案例',
    '成功案例', '客户案例', '项目案例'
  ],
  sales_script: [
    '销售话术', '话术', '怎么卖', '如何推广', '销售',
    '卖点', '推广方案', '客户沟通'
  ],
  roi_estimate: [
    'ROI', '投资回报', '节省成本', '效率提升', '估算',
    '省钱', '回报期', '性价比'
  ],
  trend_discovery: [
    '趋势', '最新', '热门', '流行', '发展方向',
    '技术趋势', '行业趋势', '最新动态'
  ],
  general_chat: [
    '你好', 'hello', 'hi', '帮助', '是什么', '怎么用'
  ],
  unknown: []
};

/**
 * 编排 Agent
 */
export class OrchestrationAgent extends BaseAgentClass {
  name = 'OrchestrationAgent';
  description = '编排 Agent - 意图识别、任务分发、结果聚合';
  capabilities = [
    {
      name: 'intent_recognition',
      description: '识别用户意图'
    },
    {
      name: 'task_distribution',
      description: '分发任务给相应 Agent'
    },
    {
      name: 'result_aggregation',
      description: '聚合多个 Agent 的结果'
    }
  ];

  /**
   * 执行编排
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      // 1. 意图识别
      const intentResult = await this.recognizeIntent(input.task);

      // 2. 根据意图分发任务
      const taskResults = await this.distributeTasks(intentResult, input);

      // 3. 聚合结果
      const finalOutput = await this.aggregateResults(intentResult, taskResults);

      const result: OrchestrationResult = {
        success: true,
        intent: intentResult,
        tasks: taskResults,
        finalOutput,
        metadata: {
          timestamp: Date.now(),
          agentCount: taskResults.length
        }
      };

      return this.successOutput(result);
    } catch (error: any) {
      return this.errorOutput(error.message || 'Orchestration failed');
    }
  }

  /**
   * 识别用户意图
   */
  private async recognizeIntent(task: string): Promise<IntentRecognitionResult> {
    const lowerTask = task.toLowerCase();

    // 优先使用关键词匹配
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === 'unknown') continue;

      for (const keyword of keywords) {
        if (lowerTask.includes(keyword.toLowerCase())) {
          const confidence = 0.8;
          return {
            intent: intent as IntentType,
            confidence,
            entities: this.extractEntities(task),
            suggestedTasks: this.getSuggestedTasks(intent as IntentType)
          };
        }
      }
    }

    // 如果关键词匹配失败，使用 LLM 进行意图识别
    return await this.llmIntentRecognition(task);
  }

  /**
   * 使用 LLM 进行意图识别
   */
  private async llmIntentRecognition(task: string): Promise<IntentRecognitionResult> {
    const prompt = `你是一个意图识别专家。请分析以下用户输入，识别其意图。

用户输入: "${task}"

可选意图:
- brainstorm: 脑力风暴 - 寻找 AI Agent 的新应用方向、新机会
- case_search: 案例搜索 - 搜索成功案例
- sales_script: 销售话术 - 生成销售话术
- roi_estimate: ROI 估算 - 计算投资回报
- trend_discovery: 趋势发现 - 发现最新趋势
- general_chat: 一般对话 - 问候、询问功能等

请以 JSON 格式输出：
{
  "intent": "意图类型",
  "confidence": 0.0-1.0,
  "entities": { "提取的实体" }
}

JSON输出：`;

    try {
      const result = await callQwen(prompt, 'qwen-turbo');
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent as IntentType || 'unknown',
          confidence: parsed.confidence || 0.5,
          entities: parsed.entities || {},
          suggestedTasks: this.getSuggestedTasks(parsed.intent as IntentType)
        };
      }
    } catch (error) {
      console.error('LLM intent recognition failed:', error);
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      entities: {},
      suggestedTasks: []
    };
  }

  /**
   * 提取实体
   */
  private extractEntities(task: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // 提取行业关键词
    const industries = ['电商', '金融', '医疗', '教育', '制造', '零售', '物流', '客服'];
    for (const industry of industries) {
      if (task.includes(industry)) {
        entities.industry = industry;
        break;
      }
    }

    // 提取时间范围
    if (task.includes('最近') || task.includes('最新')) {
      entities.timeRange = 'recent';
    }

    return entities;
  }

  /**
   * 获取建议任务
   */
  private getSuggestedTasks(intent: IntentType): string[] {
    const taskMap: Record<IntentType, string[]> = {
      brainstorm: [
        'discover_trends',
        'collect_latest_cases',
        'translate_scenes',
        'generate_insights'
      ],
      case_search: [
        'search_cases',
        'analyze_case_details'
      ],
      sales_script: [
        'generate_sales_script'
      ],
      roi_estimate: [
        'calculate_roi'
      ],
      trend_discovery: [
        'discover_trends',
        'collect_latest_cases'
      ],
      general_chat: [
        'respond_greeting'
      ],
      unknown: [
        'clarify_intent'
      ]
    };

    return taskMap[intent] || [];
  }

  /**
   * 分发任务
   */
  private async distributeTasks(
    intentResult: IntentRecognitionResult,
    input: AgentInput
  ): Promise<TaskResult[]> {
    const tasks: TaskResult[] = [];
    const startTime = Date.now();

    // 根据意图执行相应的任务
    switch (intentResult.intent) {
      case 'brainstorm':
      case 'trend_discovery':
        // 执行脑力风暴/趋势发现流程
        tasks.push(await this.executeBrainstormFlow(input, startTime));
        break;

      case 'case_search':
        tasks.push({
          agentName: 'CaseSearchAgent',
          task: 'search_cases',
          success: true,
          data: { message: '案例搜索任务' },
          duration: Date.now() - startTime
        });
        break;

      case 'sales_script':
        tasks.push({
          agentName: 'SalesScriptGeneratorAgent',
          task: 'generate_sales_script',
          success: true,
          data: { message: '销售话术生成任务' },
          duration: Date.now() - startTime
        });
        break;

      default:
        tasks.push({
          agentName: 'OrchestrationAgent',
          task: 'general_response',
          success: true,
          data: { message: '一般对话处理' },
          duration: Date.now() - startTime
        });
    }

    return tasks;
  }

  /**
   * 执行脑力风暴流程
   */
  private async executeBrainstormFlow(
    input: AgentInput,
    startTime: number
  ): Promise<TaskResult> {
    const taskResult: TaskResult = {
      agentName: 'BrainstormFlow',
      task: 'brainstorm',
      success: true,
      data: {
        message: '执行脑力风暴流程'
      },
      duration: Date.now() - startTime
    };

    return taskResult;
  }

  /**
   * 聚合结果
   */
  private async aggregateResults(
    intentResult: IntentRecognitionResult,
    taskResults: TaskResult[]
  ): Promise<string> {
    // 根据意图生成最终输出
    const prompt = `你是一个AI销售助手。请根据以下意图和任务结果，为用户生成最终回复。

意图: ${intentResult.intent}
任务结果: ${JSON.stringify(taskResults)}

用户原始需求: ${intentResult.entities.originalTask || ''}

请生成一个专业、有价值的回复。`;

    try {
      return await callQwen(prompt, 'qwen-turbo');
    } catch (error) {
      return '感谢您的提问！我正在为您分析...';
    }
  }
}

// 导出单例
export const orchestrationAgent = new OrchestrationAgent();
