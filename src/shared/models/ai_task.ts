import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import { appendUserToResult, User } from '@/shared/models/user';

import { consumeQuota, refundQuota } from './quota';

export type AITask = typeof aiTask.$inferSelect & {
  user?: User;
};
export type NewAITask = typeof aiTask.$inferInsert;
export type UpdateAITask = Partial<Omit<NewAITask, 'id' | 'createdAt'>>;

export async function createAITask(newAITask: NewAITask) {
  const result = await db().transaction(async (tx: any) => {
    // 1. create task record
    const [taskResult] = await tx.insert(aiTask).values(newAITask).returning();

    // 2. consume quota for this task
    if (newAITask.scene) {
      try {
        const consumeResult = await consumeQuota({
          userId: newAITask.userId,
          serviceType: `ai-${newAITask.mediaType}`,
          scene: newAITask.scene,
          description: `generate ${newAITask.mediaType}`,
          metadata: JSON.stringify({
            type: 'ai-task',
            mediaType: taskResult.mediaType,
            taskId: taskResult.id,
          }),
          tx,
        });

        // 3. update task record with consumed quota id and cost info
        if (consumeResult && consumeResult.quotaId) {
          taskResult.quotaId = consumeResult.quotaId;
          taskResult.costAmount = String(consumeResult.costAmount);
          taskResult.costMeasurementType = consumeResult.measurementType;
          await tx
            .update(aiTask)
            .set({
              quotaId: consumeResult.quotaId,
              costAmount: String(consumeResult.costAmount),
              costMeasurementType: consumeResult.measurementType,
            })
            .where(eq(aiTask.id, taskResult.id));
        }
      } catch (e: any) {
        throw new Error(`Insufficient quota: ${e.message}`);
      }
    }

    return taskResult;
  });

  return result;
}

export async function findAITaskById(id: string) {
  const [result] = await db().select().from(aiTask).where(eq(aiTask.id, id));
  return result;
}

export async function updateAITaskById(id: string, updateAITask: UpdateAITask) {
  const result = await db().transaction(async (tx: any) => {
    // task failed: refund quota consumption
    if (updateAITask.status === AITaskStatus.FAILED && updateAITask.quotaId) {
      await refundQuota(updateAITask.quotaId, tx);
    }

    // update task
    const [result] = await tx
      .update(aiTask)
      .set(updateAITask)
      .where(eq(aiTask.id, id))
      .returning();

    return result;
  });

  return result;
}

export async function getAITasksCount({
  userId,
  status,
  mediaType,
  provider,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    );

  return result?.count || 0;
}

export async function getAITasks({
  userId,
  status,
  mediaType,
  provider,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<AITask[]> {
  const result = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}
