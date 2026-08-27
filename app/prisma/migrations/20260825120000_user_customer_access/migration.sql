/*
  Warnings:

  - You are about to drop the column `password_hash` on the `customers` table. All the data in that column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- CreateEnum
CREATE TYPE "AccessRelationship" AS ENUM ('SELF', 'REPRESENTATIVE');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "password_hash";

-- CreateTable
CREATE TABLE "user_customer_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "relationship" "AccessRelationship" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_customer_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_customer_access_user_id_customer_id_key" ON "user_customer_access"("user_id", "customer_id");

-- CreateIndex
CREATE INDEX "user_customer_access_customer_id_idx" ON "user_customer_access"("customer_id");

-- AddForeignKey
ALTER TABLE "user_customer_access" ADD CONSTRAINT "user_customer_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_customer_access" ADD CONSTRAINT "user_customer_access_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
