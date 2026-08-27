/*
  Warnings:

  - A unique constraint covering the columns `[document]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `document` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "document" VARCHAR(18) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");
