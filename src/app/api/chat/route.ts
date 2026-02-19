import { NextResponse } from 'next/server';
import { generateSalesScript, extractCaseInfo } from '@/lib/llm';

/**
 * Chat API - AI Copilot 对话接口
 * POST /api/chat
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, mode, caseInfo, customerIndustry } = body;

    if (!message && !caseInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: message or caseInfo' },
        { status: 400 }
      );
    }

    let result: string;

    switch (mode) {
      case 'sales_script':
        // 生成销售话术
        if (!caseInfo || !customerIndustry) {
          return NextResponse.json(
            { error: 'caseInfo and customerIndustry are required for sales_script mode' },
            { status: 400 }
          );
        }
        result = await generateSalesScript(caseInfo, customerIndustry);
        break;

      case 'extract_info':
        // 从文本提取案例信息
        result = await extractCaseInfo(message);
        if (!result) {
          return NextResponse.json(
            { error: 'Failed to extract case info' },
            { status: 500 }
          );
        }
        break;

      case 'chat':
      default:
        // 普通对话模式 - 使用简单的话术模板
        result = await handleChat(message);
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
      mode: mode || 'chat',
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 处理普通对话
 */
async function handleChat(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // 简单的意图识别和回复
  if (lowerMessage.includes('客服') || lowerMessage.includes('customer service')) {
    return `我来为您推荐智能客服相关的AI Agent案例：

**热门案例推荐：**

1. **ChatGPT-Next-Web** - 一键部署私人ChatGPT应用，适合客服场景
2. **LangChain** - 构建LLM应用的开发框架，支持智能对话
3. **Dify** - 生产级Agent工作流开发平台

您想了解哪个案例的详细信息，或者需要我帮您生成销售话术吗？`;
  }

  if (lowerMessage.includes('自动化') || lowerMessage.includes('automation')) {
    return `为您推荐流程自动化相关的AI Agent案例：

**热门案例：**

1. **AutoGPT** - 自主完成多步骤任务的AI代理
2. **HyperAgent** - AI驱动的浏览器自动化
3. **OpenAdapt** - 生成式流程自动化

这些案例可以帮助企业实现重复性工作的自动化，提高效率。`;
  }

  if (lowerMessage.includes('你好') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `您好！我是 ASIP AI Copilot，您的AI Agent智能助手。

我可以帮您：
- 🔍 搜索AI Agent成功案例
- 📝 为您生成销售话术
- 💰 估算ROI投资回报
- 💡 提供AI落地建议

请问有什么可以帮您的？`;
  }

  // 默认回复
  return `感谢您的提问！根据您的需求"${message}"，我建议：

1. 在上方的案例库中搜索相关关键词
2. 点击感兴趣的案例查看详情
3. 可以让我帮您生成针对该案例的销售话术

请告诉我更多关于您的需求，我可以提供更精准的建议。`;
}
