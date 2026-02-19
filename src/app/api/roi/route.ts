import { NextResponse } from 'next/server';
import { calculateROI } from '@/lib/llm';

/**
 * ROI API - ROI 计算接口
 * POST /api/roi
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { industry, useCase, companySize } = body;

    if (!industry || !useCase || !companySize) {
      return NextResponse.json(
        { error: 'Missing required fields: industry, useCase, companySize' },
        { status: 400 }
      );
    }

    // 调用 LLM 计算 ROI
    const roiData = await calculateROI(industry, useCase, companySize);

    // 检查 LLM 返回的数据是否有效
    if (!roiData ||
        !roiData.labor_savings ||
        !roiData.annual_savings ||
        isNaN(parseInt(roiData.labor_savings)) ||
        isNaN(parseInt(roiData.annual_savings))) {
      // 如果 LLM 调用失败或返回无效数据，返回估算数据
      return NextResponse.json({
        success: true,
        data: getDefaultROI(industry, useCase, companySize),
        isDefault: true,
      });
    }

    // 解析 LLM 返回的数字
    const parsedData = {
      labor_savings: parseInt(roiData.labor_savings) || 0,
      annual_savings: parseInt(roiData.annual_savings) || 0,
      payback_period: parseInt(roiData.payback_period) || 12,
      confidence: roiData.confidence || '中',
    };

    return NextResponse.json({
      success: true,
      data: parsedData,
      isDefault: false,
    });
  } catch (error: any) {
    console.error('ROI API Error:', error);

    // 返回默认估算值
    return NextResponse.json({
      success: true,
      data: getDefaultROI(
        '通用',
        request.body ? '流程自动化' : '其他',
        '中型企业'
      ),
      isDefault: true,
      error: error.message,
    });
  }
}

/**
 * 获取默认 ROI 估算值（当 LLM 不可用时）
 */
function getDefaultROI(industry: string, useCase: string, companySize: string): any {
  // 基础估算值
  const baseValues: Record<string, { labor: number; annual: number; payback: number }> = {
    '大型企业': { labor: 5, annual: 600000, payback: 6 },
    '中型企业': { labor: 3, annual: 360000, payback: 8 },
    '小型企业': { labor: 1, annual: 120000, payback: 10 },
  };

  // 用例调整系数
  const useCaseMultiplier: Record<string, number> = {
    '智能客服': 1.2,
    '流程自动化': 1.5,
    '数据分析': 1.3,
    'AI 助手': 1.1,
    '内容生成': 1.0,
    '知识库': 1.4,
    '搜索': 1.2,
    '其他': 1.0,
  };

  const base = baseValues[companySize] || baseValues['中型企业'];
  const multiplier = useCaseMultiplier[useCase] || 1.0;

  return {
    labor_savings: Math.round(base.labor * multiplier),
    annual_savings: Math.round(base.annual * multiplier),
    payback_period: Math.round(base.payback / multiplier),
    confidence: multiplier >= 1.3 ? '高' : multiplier >= 1.0 ? '中' : '低',
    note: '此为估算值，实际ROI可能因企业具体情况而异',
  };
}
