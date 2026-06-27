-- CreateTable
CREATE TABLE "work_order_statuses" (
    "code" "WorkOrderStatus" NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "work_order_statuses_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_order_statuses_priority_key" ON "work_order_statuses"("priority");

-- Seed priority rows before FK so existing work_orders rows are not orphaned
INSERT INTO "work_order_statuses" ("code", "priority") VALUES
    ('RECEIVED',          1),
    ('IN_DIAGNOSIS',      2),
    ('AWAITING_APPROVAL', 3),
    ('REJECTED',          4),
    ('APPROVED',          5),
    ('IN_PROGRESS',       6),
    ('COMPLETED',         7),
    ('DELIVERED',         8),
    ('CANCELLED',         9);

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_status_fkey"
    FOREIGN KEY ("status") REFERENCES "work_order_statuses"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;
