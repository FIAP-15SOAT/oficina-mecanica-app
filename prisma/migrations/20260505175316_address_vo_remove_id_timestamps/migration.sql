/*
  Warnings:

  - The primary key for the `addresses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `addresses` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "addresses_customer_id_key";

-- AlterTable
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_pkey",
DROP COLUMN "created_at",
DROP COLUMN "id",
DROP COLUMN "updated_at",
ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("customer_id");
