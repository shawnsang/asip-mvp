/**
 * Base Agent Class
 * 基础 Agent 类
 */

import { AgentInput, AgentOutput, BaseAgent, AgentCapability } from './types';
import { callQwen } from '../llm';

/**
 * 基础 Agent 抽象类
 */
export abstract class BaseAgentClass implements BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract capabilities: AgentCapability[];

  /**
   * 执行任务 - 子类必须实现
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * 检查是否可以处理该任务
   */
  canHandle(task: string): boolean {
    const lowerTask = task.toLowerCase();
    return this.capabilities.some(cap =>
      lowerTask.includes(cap.name.toLowerCase()) ||
      lowerTask.includes(cap.description.toLowerCase())
    );
  }

  /**
   * 调用 LLM
   */
  protected async callLLM(prompt: string, model: string = 'qwen-plus'): Promise<string> {
    return await callQwen(prompt, model as any);
  }

  /**
   * 构建提示词
   */
  protected buildPrompt(template: string, params: Record<string, any>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(params)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return prompt;
  }

  /**
   * 成功输出
   */
  protected successOutput(data: any, metadata?: Record<string, any>): AgentOutput {
    return {
      success: true,
      data,
      metadata
    };
  }

  /**
   * 错误输出
   */
  protected errorOutput(error: string): AgentOutput {
    return {
      success: false,
      data: null,
      error
    };
  }
}

/**
 * Agent 工厂 - 创建 Agent 实例
 */
export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map();

  static register(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
  }

  static get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  static getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  static clear(): void {
    this.agents.clear();
  }
}

export default BaseAgentClass;
