-- AlterEnum
ALTER TYPE "WorkOrderStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "rejected_at" TIMESTAMP(3);
