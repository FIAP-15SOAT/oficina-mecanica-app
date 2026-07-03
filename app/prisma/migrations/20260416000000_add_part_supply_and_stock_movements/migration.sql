-- CreateEnum
CREATE TYPE "PartSupplyCategory" AS ENUM ('PART', 'SUPPLY');

-- AlterEnum
BEGIN;
CREATE TYPE "StockMovementType_new" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');
ALTER TABLE "stock_movements" ALTER COLUMN "type" TYPE "StockMovementType_new" USING ("type"::text::"StockMovementType_new");
ALTER TYPE "StockMovementType" RENAME TO "StockMovementType_old";
ALTER TYPE "StockMovementType_new" RENAME TO "StockMovementType";
DROP TYPE "public"."StockMovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_part_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_parts" DROP CONSTRAINT "work_order_parts_part_id_fkey";

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "part_id",
ADD COLUMN     "part_supply_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "work_order_parts" DROP COLUMN "part_id",
ADD COLUMN     "part_supply_id" UUID NOT NULL;

-- DropTable
DROP TABLE "parts";

-- CreateTable
CREATE TABLE "parts_supplies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "sku" VARCHAR(60) NOT NULL,
    "part_number" VARCHAR(60),
    "category" "PartSupplyCategory" NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'UN',
    "cost_price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parts_supplies_sku_key" ON "parts_supplies"("sku");

-- AddForeignKey
ALTER TABLE "work_order_parts" ADD CONSTRAINT "work_order_parts_part_supply_id_fkey" FOREIGN KEY ("part_supply_id") REFERENCES "parts_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_part_supply_id_fkey" FOREIGN KEY ("part_supply_id") REFERENCES "parts_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
