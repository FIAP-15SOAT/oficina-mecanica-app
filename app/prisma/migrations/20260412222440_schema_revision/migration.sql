/*
  Warnings:

  - Made the column `email` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "quotes_work_order_id_key";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "mileage_at_service" INTEGER;
