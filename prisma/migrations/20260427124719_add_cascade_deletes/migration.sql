-- DropForeignKey
ALTER TABLE "quote_part_supplies" DROP CONSTRAINT "quote_part_supplies_quote_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_services" DROP CONSTRAINT "quote_services_quote_id_fkey";

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "status_history" DROP CONSTRAINT "status_history_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_reservations" DROP CONSTRAINT "stock_reservations_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_part_supplies" DROP CONSTRAINT "work_order_part_supplies_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_services" DROP CONSTRAINT "work_order_services_work_order_id_fkey";

-- AddForeignKey
ALTER TABLE "work_order_services" ADD CONSTRAINT "work_order_services_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_part_supplies" ADD CONSTRAINT "work_order_part_supplies_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_services" ADD CONSTRAINT "quote_services_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_part_supplies" ADD CONSTRAINT "quote_part_supplies_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
