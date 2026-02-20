/**
 * Sales Script Generator Agent
 * 销售话术生成 Agent - 生成场景化销售话术
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 销售话术类型
 */
interface SalesScript {
  id: string;
  type: 'cold_call' | 'follow_up' | 'demo' | 'objection_handling' | 'closing';
  title: string;
  content: string;
  keyPoints: string[];
  tips: string[];
}

/**
 * 客户画像
 */
interface CustomerProfile {
  industry: string;
  companySize: string;
  role: string;
  painPoints: string[];
  interests: string[];
}

/**
 * Sales Script Generator Agent
 */
export class SalesScriptGeneratorAgent extends BaseAgentClass {
  name = 'SalesScriptGeneratorAgent';
  description = '销售话术生成 Agent - 生成场景化销售话术';
  capabilities = [
    {
      name: 'generate_cold_call_script',
      description: '生成冷电话术'
    },
    {
      name: 'generate_follow_up_script',
      description: '生成跟进话术'
    },
    {
      name: 'generate_demo_script',
      description: '生成演示话术'
    },
    {
      name: 'handle_objections',
      description: '处理客户异议'
    },
    {
      name: 'generate_closing_script',
      description: '生成成交话术'
    }
  ];

  /**
   * 执行话术生成
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const type = input.params?.type || 'cold_call';
      const scene = input.params?.scene;
      const customer = input.params?.customer as CustomerProfile;
      const caseInfo = input.params?.caseInfo;

      if (!scene && !customer && !caseInfo) {
        return this.errorOutput('Missing scene, customer, or caseInfo');
      }

      // 生成对应类型的话术
      let script: SalesScript;

      switch (type) {
        case 'cold_call':
          script = await this.generateColdCallScript(scene, customer, caseInfo);
          break;
        case 'follow_up':
          script = await this.generateFollowUpScript(scene, customer, caseInfo);
          break;
        case 'demo':
          script = await this.generateDemoScript(scene, customer, caseInfo);
          break;
        case 'objection_handling':
          script = await this.generateObjectionHandlingScript(scene, customer);
          break;
        case 'closing':
          script = await this.generateClosingScript(scene, customer);
          break;
        default:
          script = await this.generateColdCallScript(scene, customer, caseInfo);
      }

      // 生成补充话术
      const additionalScripts = await this.generateAdditionalScripts(
        type,
        scene,
        customer
      );

      return this.successOutput({
        primaryScript: script,
        additionalScripts,
        metadata: {
          type,
          customerIndustry: customer?.industry || scene?.industry || '通用',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Script generation failed');
    }
  }

  /**
   * 生成冷电话术
   */
  private async generateColdCallScript(
    scene: any,
    customer: CustomerProfile | undefined,
    caseInfo: any
  ): Promise<SalesScript> {
    const industry = customer?.industry || scene?.industry || '通用';
    const useCase = scene?.useCase || '业务场景';
    const painPoints = customer?.painPoints || scene?.painPoints || ['效率提升需求'];

    const prompt = `你是一个资深 AI 销售顾问。请根据以下信息，生成专业的冷电话术。

客户行业：${industry}
使用场景：${useCase}
客户痛点：${painPoints.join(', ')}

案例信息：
${caseInfo ? JSON.stringify(caseInfo) : '无'}

请生成以下格式的话术：

### 开场白（15秒）
[简短有力的开场，吸引客户注意力]

### 价值主张（30秒）
[介绍 AI Agent 能为客户带来什么价值]

### 案例分享（30秒）
[分享相关成功案例，增强可信度]

### 收尾提问（15秒）
[提出引导性问题，了解客户需求]

---
话术要求：
- 简洁有力，适合电话沟通
- 突出客户痛点和价值
- 语气专业自信
- 避免过度推销感

请生成话术：`;

    const content = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'cold-call-1',
      type: 'cold_call',
      title: `冷电话术 - ${industry}行业`,
      content,
      keyPoints: [
        '开场引起兴趣',
        '突出价值主张',
        '案例增强信任',
        '收尾获取承诺'
      ],
      tips: [
        '保持语速适中',
        '注意倾听客户反馈',
        '准备好回答客户问题'
      ]
    };
  }

  /**
   * 生成跟进话术
   */
  private async generateFollowUpScript(
    scene: any,
    customer: CustomerProfile | undefined,
    caseInfo: any
  ): Promise<SalesScript> {
    const industry = customer?.industry || scene?.industry || '通用';

    const prompt = `你是一个资深 AI 销售顾问。请根据以下信息，生成专业的跟进话术。

客户行业：${industry}
上次沟通内容：${caseInfo?.title || '初次接触'}

请生成以下格式的话术：

### 回访开场
[说明来电目的]

### 需求确认
[确认客户当前需求和痛点]

### 方案介绍
[根据需求介绍解决方案]

### 下一步行动
[约定下次沟通或演示时间]

---
话术要求：
- 体现专业性和耐心
- 突出个性化关怀
- 给出明确的行动建议

请生成话术：`;

    const content = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'follow-up-1',
      type: 'follow_up',
      title: `跟进话术 - ${industry}行业`,
      content,
      keyPoints: [
        '体现专业跟进',
        '确认客户需求',
        '提供价值信息',
        '推进销售进程'
      ],
      tips: [
        '记录上次沟通要点',
        '准备针对性的问题',
        '给客户准备时间'
      ]
    };
  }

  /**
   * 生成演示话术
   */
  private async generateDemoScript(
    scene: any,
    customer: CustomerProfile | undefined,
    caseInfo: any
  ): Promise<SalesScript> {
    const industry = customer?.industry || scene?.industry || '通用';
    const useCase = scene?.useCase || '核心业务场景';

    const prompt = `你是一个资深 AI 销售顾问。请根据以下信息，生成专业的演示话术。

客户行业：${industry}
演示场景：${useCase}
客户角色：${customer?.role || '决策者'}

请生成以下格式的话术：

### 演示开场（2分钟）
[介绍演示流程和预期成果]

### 核心功能演示（10分钟）
[分步骤展示核心功能]

### 场景化演示（5分钟）
[针对客户场景的实际操作]

### 价值总结（3分钟）
[总结演示亮点和客户收益]

### Q&A 环节
[常见问题回答]

---
话术要求：
- 突出与客户场景相关的功能
- 强调实际价值而非功能本身
- 适时停顿询问客户反馈

请生成话术：`;

    const content = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'demo-1',
      type: 'demo',
      title: `演示话术 - ${industry}行业${useCase}场景`,
      content,
      keyPoints: [
        '开场建立预期',
        '功能展示清晰',
        '场景化演示',
        '价值总结明确'
      ],
      tips: [
        '提前测试演示环境',
        '准备多个演示场景',
        '留时间给客户提问'
      ]
    };
  }

  /**
   * 生成异议处理话术
   */
  private async generateObjectionHandlingScript(
    scene: any,
    customer: CustomerProfile | undefined
  ): Promise<SalesScript> {
    const industry = customer?.industry || scene?.industry || '通用';

    const prompt = `你是一个资深 AI 销售顾问。请为 ${industry} 行业的客户生成常见的异议处理话术。

常见异议类型：
1. "价格太高"
2. "我们已经在用其他产品"
3. "暂时不需要"
4. "需要考虑/汇报领导"
5. "效果不明显怎么办"

请为每种异议生成处理话术：

### 异议1：[价格问题]
- 处理思路：
- 话术示例：

### 异议2：[竞品比较]
- 处理思路：
- 话术示例：

... 以此类推

---
话术要求：
- 展现同理心
- 转化异议为卖点
- 提供具体证据
- 给客户台阶下

请生成话术：`;

    const content = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'objection-1',
      type: 'objection_handling',
      title: `异议处理话术 - ${industry}行业`,
      content,
      keyPoints: [
        '同理心倾听',
        '认同客户观点',
        '提供证据支持',
        '转化异议为价值'
      ],
      tips: [
        '不要急于反驳',
        '了解真正顾虑',
        '准备数据和案例'
      ]
    };
  }

  /**
   * 生成成交话术
   */
  private async generateClosingScript(
    scene: any,
    customer: CustomerProfile | undefined
  ): Promise<SalesScript> {
    const industry = customer?.industry || scene?.industry || '通用';

    const prompt = `你是一个资深 AI 销售顾问。请为 ${industry} 行业的客户生成成交话术。

请生成以下格式的话术：

### 成交信号识别
[识别客户发出的成交信号]

### 价值确认
[与客户确认价值和预期]

### 合作方案确认
[明确合作细节和下一步]

### 签约引导
[自然过渡到签约环节]

### 后续安排
[明确后续流程和时间表]

---
话术要求：
- 把握成交时机
- 减少客户决策压力
- 明确后续流程
- 建立长期关系

请生成话术：`;

    const content = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'closing-1',
      type: 'closing',
      title: `成交话术 - ${industry}行业`,
      content,
      keyPoints: [
        '识别成交信号',
        '确认客户需求',
        '明确合作方案',
        '推进签约决策'
      ],
      tips: [
        '把握最佳时机',
        '不要过于急切',
        '准备多种成交方式'
      ]
    };
  }

  /**
   * 生成补充话术
   */
  private async generateAdditionalScripts(
    type: string,
    scene: any,
    customer: CustomerProfile | undefined
  ): Promise<SalesScript[]> {
    const scripts: SalesScript[] = [];

    // 根据类型生成其他相关话术
    if (type !== 'objection_handling') {
      scripts.push({
        id: 'additional-objection',
        type: 'objection_handling',
        title: '补充：常见异议处理',
        content: '针对客户可能的疑虑，建议准备以下问题的回答...',
        keyPoints: ['价格', '效果', '安全性'],
        tips: ['提前准备', '用案例说话']
      });
    }

    if (type !== 'closing') {
      scripts.push({
        id: 'additional-closing',
        type: 'closing',
        title: '补充：成交引导',
        content: '当客户表现出兴趣时，可以这样推进...',
        keyPoints: ['把握时机', '明确价值'],
        tips: ['不要急于成交', '建立信任']
      });
    }

    return scripts;
  }
}

// 导出单例
export const salesScriptGeneratorAgent = new SalesScriptGeneratorAgent();
