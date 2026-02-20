/**
 * Scene Translator Agent
 * 场景转化 Agent - 将技术案例转化为企业可理解的场景描述
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 场景类型
 */
interface BusinessScene {
  name: string;
  description: string;
  industry: string;
  useCase: string;
  painPoints: string[];
  benefits: string[];
  valueProposition: string;
  targetCompanies: string[];
}

/**
 * 技术到场景的映射
 */
const TECH_TO_SCENE_MAPPING: Record<string, string[]> = {
  'browser-automation': ['电商运营', '数据采集', '报表自动化', '批量操作'],
  'code-generation': ['软件开发', '代码审查', '技术文档', 'API 生成'],
  'rag': ['知识管理', '智能问答', '文档检索', '培训助手'],
  'multi-agent': ['复杂任务处理', '跨系统协作', '智能决策', '流程自动化'],
  'computer-use': ['桌面自动化', '企业应用操作', 'GUI 自动化'],
  'conversational-ai': ['智能客服', '语音助手', '在线沟通', '用户服务']
};

/**
 * 行业场景库
 */
const INDUSTRY_SCENES: Record<string, string[]> = {
  '电商': ['店铺运营', '商品上架', '客户咨询', '订单处理', '数据分析'],
  '金融': ['风险评估', '客户服务', '反欺诈', '投资分析', '合规审查'],
  '医疗': ['患者服务', '病历管理', '药物咨询', '预约管理', '健康咨询'],
  '教育': ['智能辅导', '作业批改', '课程推荐', '学员管理', '答疑解惑'],
  '制造': ['生产监控', '质量检测', '供应链管理', '设备维护', '智能排产'],
  '零售': ['商品推荐', '库存管理', '客户分析', '营销自动化', '门店运营'],
  '物流': ['路径规划', '订单跟踪', '调度优化', '客户服务', '数据分析'],
  '客服': ['智能问答', '问题分类', '情绪分析', '知识库', '工单处理']
};

/**
 * Scene Translator Agent
 */
export class SceneTranslatorAgent extends BaseAgentClass {
  name = 'SceneTranslatorAgent';
  description = '场景转化 Agent - 将技术案例转化为企业可理解的场景描述';
  capabilities = [
    {
      name: 'translate_technical',
      description: '将技术特征转化为业务场景'
    },
    {
      name: 'map_industry',
      description: '映射到具体行业场景'
    },
    {
      name: 'extract_value',
      description: '提取客户价值主张'
    }
  ];

  /**
   * 执行场景转化
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const cases = input.params?.cases || [];
      const targetIndustry = input.params?.industry;

      if (!cases || cases.length === 0) {
        return this.errorOutput('No cases provided for translation');
      }

      // 1. 分析每个案例的技术特征
      const analyzedCases = await Promise.all(
        cases.map((c: any) => this.analyzeTechnicalFeatures(c))
      );

      // 2. 转化为业务场景
      const businessScenes = await this.translateToBusinessScenes(
        analyzedCases,
        targetIndustry
      );

      // 3. 生成场景建议
      const suggestions = await this.generateSceneSuggestions(businessScenes);

      return this.successOutput({
        scenes: businessScenes,
        suggestions,
        metadata: {
          inputCases: cases.length,
          outputScenes: businessScenes.length,
          targetIndustry: targetIndustry || '通用',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Scene translation failed');
    }
  }

  /**
   * 分析技术特征
   */
  private async analyzeTechnicalFeatures(caseData: any): Promise<any> {
    const prompt = `你是一个 AI 技术分析专家。请分析以下 AI Agent 案例，提取其技术特征。

案例信息：
- 标题: ${caseData.title}
- 描述: ${caseData.description}
- 来源: ${caseData.source}
- 标签: ${caseData.tags?.join(', ') || '无'}

请提取以下技术特征（JSON 格式）：
{
  "technical_features": ["特征1", "特征2"],
  "core_capability": "核心能力",
  "technology_stack": ["技术栈"],
  "use_case_technical": "技术用例描述"
}

JSON输出：`;

    try {
      const result = await callQwen(prompt, 'qwen-plus');
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return {
          ...caseData,
          ...JSON.parse(jsonMatch[0])
        };
      }
    } catch (error) {
      console.error('Technical analysis failed:', error);
    }

    return {
      ...caseData,
      technical_features: ['通用 AI 能力'],
      core_capability: '智能问答',
      technology_stack: ['LLM'],
      use_case_technical: '自动化任务处理'
    };
  }

  /**
   * 转化为业务场景
   */
  private async translateToBusinessScenes(
    analyzedCases: any[],
    targetIndustry?: string
  ): Promise<BusinessScene[]> {
    const scenes: BusinessScene[] = [];

    for (const c of analyzedCases) {
      // 查找匹配的行业场景
      const industries = targetIndustry
        ? [targetIndustry]
        : Object.keys(INDUSTRY_SCENES);

      for (const industry of industries) {
        const scene = this.mapToBusinessScene(c, industry);
        scenes.push(scene);
      }
    }

    return scenes;
  }

  /**
   * 映射到业务场景
   */
  private mapToBusinessScene(caseData: any, industry: string): BusinessScene {
    // 根据技术特征匹配场景
    const tags = caseData.tags || [];
    let matchedScenes = INDUSTRY_SCENES[industry] || ['通用业务场景'];

    // 智能匹配场景
    for (const tag of tags) {
      if (TECH_TO_SCENE_MAPPING[tag]) {
        const mapped = TECH_TO_SCENE_MAPPING[tag];
        matchedScenes = matchedScenes.concat(mapped);
      }
    }

    const primaryScene = matchedScenes[0];

    return {
      name: `${industry} - ${primaryScene}`,
      description: this.generateSceneDescription(caseData, industry, primaryScene),
      industry,
      useCase: primaryScene,
      painPoints: this.extractPainPoints(industry, primaryScene),
      benefits: this.extractBenefits(industry, primaryScene),
      valueProposition: this.generateValueProposition(caseData, industry),
      targetCompanies: this.getTargetCompanies(industry)
    };
  }

  /**
   * 生成场景描述
   */
  private generateSceneDescription(
    caseData: any,
    industry: string,
    useCase: string
  ): string {
    return `在 ${industry} 行业，${caseData.description || caseData.title}。该技术可应用于 ${useCase} 场景，帮助企业实现智能化升级。`;
  }

  /**
   * 提取痛点
   */
  private extractPainPoints(industry: string, useCase: string): string[] {
    const painPointMap: Record<string, Record<string, string[]>> = {
      '电商': {
        '店铺运营': ['人工处理商品上架效率低', '促销活动管理繁琐', '客户咨询响应慢'],
        '客户咨询': ['客服人力成本高', '咨询量大时响应不及时', '夜间无人值守']
      },
      '金融': {
        '客户服务': ['客户等待时间长', '重复问题消耗人力', '服务标准难统一'],
        '风险评估': ['人工审核效率低', '风险识别不全面', '决策依据不充分']
      },
      '医疗': {
        '患者服务': ['患者等待时间长', '咨询量大医生资源有限', '知识更新不及时'],
        '健康咨询': ['专业医学知识获取困难', '预约挂号流程繁琐']
      },
      '教育': {
        '智能辅导': ['课后辅导时间有限', '个性化辅导难实现', '作业批改工作量大'],
        '答疑解惑': ['问题响应不及时', '重复问题消耗资源']
      },
      '制造': {
        '生产监控': ['人工监控效率低', '异常发现不及时', '数据孤岛问题'],
        '质量检测': ['人工检测标准不统一', '检测效率低', '漏检风险高']
      },
      '通用': {
        '智能问答': ['知识查找困难', '重复问题多', '响应不及时']
      }
    };

    return painPointMap[industry]?.[useCase] || painPointMap['通用']['智能问答'];
  }

  /**
   * 提取价值/收益
   */
  private extractBenefits(industry: string, useCase: string): string[] {
    const benefitsMap: Record<string, string[]> = {
      '效率提升': ['减少人工重复工作', '7x24小时服务', '快速响应客户'],
      '成本降低': ['减少人力投入', '降低培训成本', '减少错误率'],
      '质量提升': ['服务标准化', '决策更科学', '知识积累沉淀']
    };

    return [
      ...benefitsMap['效率提升'],
      ...benefitsMap['成本降低'],
      ...benefitsMap['质量提升']
    ];
  }

  /**
   * 生成价值主张
   */
  private generateValueProposition(caseData: any, industry: string): string {
    return `通过引入 AI Agent 技术，帮助 ${industry} 企业实现业务流程自动化，提升运营效率，降低人力成本，同时保证服务质量的一致性。`;
  }

  /**
   * 获取目标企业类型
   */
  private getTargetCompanies(industry: string): string[] {
    const targetMap: Record<string, string[]> = {
      '电商': ['电商平台卖家', '品牌商', '电商代运营公司'],
      '金融': ['银行', '保险公司', '证券公司', '互联网金融公司'],
      '医疗': ['医院', '诊所', '健康管理公司', '医药电商'],
      '教育': ['培训机构', '在线教育平台', '高校', 'K12教育机构'],
      '制造': ['制造业工厂', '设备制造商', '工业自动化公司'],
      '零售': ['零售商', '品牌商', '连锁门店', '购物中心'],
      '物流': ['物流公司', '快递公司', '供应链管理公司'],
      '客服': ['呼叫中心', '客服外包公司', '企业客服部门']
    };

    return targetMap[industry] || ['各行业中型以上企业'];
  }

  /**
   * 生成场景建议
   */
  private async generateSceneSuggestions(scenes: BusinessScene[]): Promise<string> {
    const prompt = `你是一个 AI 销售顾问。请根据以下业务场景列表，生成场景建议。

场景列表：
${JSON.stringify(scenes.slice(0, 5), null, 2)}

请生成以下格式的建议：

## 【场景建议】

### 1. [场景名称]
- 适用行业：[行业]
- 核心价值：[价值主张]
- 客户痛点：[痛点列表]
- 预期收益：[收益列表]
- 目标客户：[目标客户]

### 2. ...

建议：`;

    try {
      return await callQwen(prompt, 'qwen-plus');
    } catch (error) {
      return '场景建议生成失败';
    }
  }
}

// 导出单例
export const sceneTranslatorAgent = new SceneTranslatorAgent();
