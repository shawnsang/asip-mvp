import { NextResponse } from 'next/server';

// 简单的 CRON 密钥验证
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // 验证密钥
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 这里可以调用采集脚本
    // 由于服务器环境限制，建议通过外部 cron job 调用

    return NextResponse.json({
      success: true,
      message: '数据更新任务已触发',
      note: '请通过 GitHub Actions 或外部 cron job 定期触发',
      lastRun: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
