-- CreateIndex
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles"("customer_id");

-- CreateIndex
CREATE INDEX "work_orders_customer_id_idx" ON "work_orders"("customer_id");

-- CreateIndex
CREATE INDEX "work_orders_vehicle_id_idx" ON "work_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "work_orders_assigned_user_id_idx" ON "work_orders"("assigned_user_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_status_created_at_idx" ON "work_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "work_order_services_service_id_idx" ON "work_order_services"("service_id");

-- CreateIndex
CREATE INDEX "work_order_part_supplies_part_supply_id_idx" ON "work_order_part_supplies"("part_supply_id");

-- CreateIndex
CREATE INDEX "quotes_work_order_id_idx" ON "quotes"("work_order_id");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quote_services_service_id_idx" ON "quote_services"("service_id");

-- CreateIndex
CREATE INDEX "quote_part_supplies_part_supply_id_idx" ON "quote_part_supplies"("part_supply_id");

-- CreateIndex
CREATE INDEX "status_history_work_order_id_idx" ON "status_history"("work_order_id");

-- CreateIndex
CREATE INDEX "status_history_changed_by_id_idx" ON "status_history"("changed_by_id");

-- CreateIndex
CREATE INDEX "stock_movements_part_supply_id_idx" ON "stock_movements"("part_supply_id");

-- CreateIndex
CREATE INDEX "stock_movements_work_order_id_idx" ON "stock_movements"("work_order_id");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_reservations_part_supply_id_idx" ON "stock_reservations"("part_supply_id");

-- CreateIndex
CREATE INDEX "stock_reservations_work_order_id_idx" ON "stock_reservations"("work_order_id");
