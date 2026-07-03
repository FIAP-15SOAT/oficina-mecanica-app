/*
  Warnings:

  - You are about to drop the `quote_parts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "quote_parts" DROP CONSTRAINT "quote_parts_part_supply_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_parts" DROP CONSTRAINT "quote_parts_quote_id_fkey";

-- DropTable
DROP TABLE "quote_parts";

-- CreateTable
CREATE TABLE "quote_part_supplies" (
    "quote_id" UUID NOT NULL,
    "part_supply_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_part_supplies_pkey" PRIMARY KEY ("quote_id","part_supply_id")
);

-- AddForeignKey
ALTER TABLE "quote_part_supplies" ADD CONSTRAINT "quote_part_supplies_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_part_supplies" ADD CONSTRAINT "quote_part_supplies_part_supply_id_fkey" FOREIGN KEY ("part_supply_id") REFERENCES "parts_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
