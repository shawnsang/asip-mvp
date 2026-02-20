/**
 * Async Task Manager
 * 异步任务管理器 - 后台收集资料，推送结果
 */

// 任务存储（内存中，生产环境应该用 Redis）
const tasks = new Map<string, AsyncTask>();

interface AsyncTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 创建异步任务
 */
export function createTask(): string {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  tasks.set(taskId, {
    id: taskId,
    status: 'pending',
    progress: 0,
    message: '任务已创建',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return taskId;
}

/**
 * 更新任务状态
 */
export function updateTask(taskId: string, updates: Partial<AsyncTask>): void {
  const task = tasks.get(taskId);
  if (task) {
    Object.assign(task, updates, { updatedAt: Date.now() });
    tasks.set(taskId, task);
  }
}

/**
 * 获取任务状态
 */
export function getTask(taskId: string): AsyncTask | undefined {
  return tasks.get(taskId);
}

/**
 * 清理过期任务（超过 30 分钟）
 */
export function cleanupTasks(): void {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 分钟

  const taskIds = Array.from(tasks.keys());
  for (const id of taskIds) {
    const task = tasks.get(id);
    if (task && now - task.createdAt > maxAge) {
      tasks.delete(id);
    }
  }
}

// 每小时清理一次
setInterval(cleanupTasks, 60 * 60 * 1000);

export default {};
