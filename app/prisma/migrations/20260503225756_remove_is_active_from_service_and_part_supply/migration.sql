/*
  Warnings:

  - You are about to drop the column `is_active` on the `parts_supplies` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "parts_supplies" DROP COLUMN "is_active";

-- AlterTable
ALTER TABLE "services" DROP COLUMN "is_active";
