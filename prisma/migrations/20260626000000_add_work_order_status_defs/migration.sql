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
    ('IN_PROGRESS',       1),
    ('AWAITING_APPROVAL', 2),
    ('APPROVED',          3),
    ('IN_DIAGNOSIS',      4),
    ('RECEIVED',          5),
    ('REJECTED',          6),
    ('CANCELLED',         7),
    ('COMPLETED',         8),
    ('DELIVERED',         9);

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_status_fkey"
    FOREIGN KEY ("status") REFERENCES "work_order_statuses"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;
