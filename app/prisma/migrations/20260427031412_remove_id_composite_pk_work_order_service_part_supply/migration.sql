/*
  Warnings:

  - The primary key for the `work_order_part_supplies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `work_order_part_supplies` table. All the data in the column will be lost.
  - The primary key for the `work_order_services` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `work_order_services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "work_order_part_supplies" DROP CONSTRAINT "work_order_part_supplies_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "work_order_part_supplies_pkey" PRIMARY KEY ("work_order_id", "part_supply_id");

-- AlterTable
ALTER TABLE "work_order_services" DROP CONSTRAINT "work_order_services_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "work_order_services_pkey" PRIMARY KEY ("work_order_id", "service_id");
