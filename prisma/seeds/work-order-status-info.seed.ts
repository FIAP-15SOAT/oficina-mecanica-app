/* eslint-disable no-console */
import { PrismaClient, WorkOrderStatus } from '../generated/client';
import { WORK_ORDER_STATUS_PRIORITY } from '../../src/domain/constants/work-order-status-priority.constant';

export async function seedWorkOrderStatusInfos(prisma: PrismaClient): Promise<void> {
  const rows = Object.entries(WORK_ORDER_STATUS_PRIORITY).map(([code, priority]) => ({
    code: code as WorkOrderStatus,
    priority,
  }));

  for (const row of rows) {
    await prisma.workOrderStatusInfo.upsert({
      where: { code: row.code },
      update: { priority: row.priority },
      create: row,
    });
  }

  console.log(`✅ WorkOrderStatusInfo: ${rows.length} rows seeded`);
}
