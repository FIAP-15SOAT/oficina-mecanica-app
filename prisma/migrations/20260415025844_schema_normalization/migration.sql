/*
  Warnings:

  - You are about to drop the column `address` on the `customers` table. All the data in the column will be lost.
  - The `type` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unit` column on the `parts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `quotes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `previous_status` column on the `status_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `time_spent_min` on the `work_order_services` table. All the data in the column will be lost.
  - The `status` column on the `work_order_services` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `work_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `new_status` on the `status_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `stock_movements` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MECHANIC', 'ATTENDANT');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "WorkOrderServiceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'SENT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UN', 'KG', 'L', 'ML', 'M', 'CX', 'PC', 'JG');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "address",
DROP COLUMN "type",
ADD COLUMN     "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "parts" DROP COLUMN "unit",
ADD COLUMN     "unit" "Unit" NOT NULL DEFAULT 'UN';

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "status",
ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "status_history" DROP COLUMN "previous_status",
ADD COLUMN     "previous_status" "WorkOrderStatus",
DROP COLUMN "new_status",
ADD COLUMN     "new_status" "WorkOrderStatus" NOT NULL;

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "type",
ADD COLUMN     "type" "StockMovementType" NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ATTENDANT';

-- AlterTable
ALTER TABLE "work_order_services" DROP COLUMN "time_spent_min",
ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "started_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "WorkOrderServiceStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "work_orders" DROP COLUMN "status",
ADD COLUMN     "status" "WorkOrderStatus" NOT NULL DEFAULT 'RECEIVED';

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "street" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" VARCHAR(9) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
