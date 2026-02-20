import { NextResponse } from 'next/server';
import { getTask, updateTask, createTask } from '@/lib/agents/async-task';
import { runBrainstormFlow } from '@/lib/agents/workflows';

/**
 * Task Status API - 获取异步任务状态
 * GET /api/chat/task?taskId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    const task = getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        message: task.message,
        result: task.status === 'completed' ? task.result : undefined,
        error: task.status === 'failed' ? task.error : undefined
      }
    });
  } catch (error: any) {
    console.error('Task API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create Brainstorm Task API - 创建脑力风暴异步任务
 * POST /api/chat/task
 * Body: { query: string, industry?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, industry } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query' },
        { status: 400 }
      );
    }

    // 创建任务
    const taskId = createTask();

    // 立即返回任务 ID
    updateTask(taskId, {
      status: 'processing',
      progress: 10,
      message: '正在分析您的问题...'
    });

    // 后台异步执行
    executeBrainstormTask(taskId, query, industry);

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        status: 'processing',
        message: '任务已创建，正在后台处理'
      }
    });
  } catch (error: any) {
    console.error('Create Task API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 后台执行脑力风暴任务
 */
async function executeBrainstormTask(taskId: string, query: string, industry?: string): Promise<void> {
  try {
    updateTask(taskId, {
      progress: 20,
      message: '正在收集最新趋势...'
    });

    // 执行脑力风暴流程
    const result = await runBrainstormFlow({
      query,
      industry
    });

    if (result.success) {
      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: '分析完成',
        result: result.data
      });
    } else {
      updateTask(taskId, {
        status: 'failed',
        message: '任务执行失败',
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Brainstorm task error:', error);
    updateTask(taskId, {
      status: 'failed',
      message: '任务执行失败',
      error: error.message
    });
  }
}
