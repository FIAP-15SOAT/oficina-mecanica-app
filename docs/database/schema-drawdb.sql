-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MECHANIC', 'ATTENDANT');
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "WorkOrderStatus" AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED');
CREATE TYPE "WorkOrderServiceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'SENT', 'APPROVED', 'REJECTED');
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
CREATE TYPE "Unit" AS ENUM ('UN', 'KG', 'L', 'ML', 'M', 'CX', 'PC', 'JG');

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(150) NOT NULL,
  "email" VARCHAR(150) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'ATTENDANT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "customers" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(150) NOT NULL,
  "document" VARCHAR(18) NOT NULL UNIQUE,
  "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
  "email" VARCHAR(150) NOT NULL UNIQUE,
  "phone" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "addresses" (
  "id" UUID PRIMARY KEY,
  "customer_id" UUID NOT NULL,
  "street" VARCHAR(255) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(2) NOT NULL,
  "zip_code" VARCHAR(9) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("customer_id") REFERENCES "customers" ("id")
);

CREATE TABLE "vehicles" (
  "id" UUID PRIMARY KEY,
  "customer_id" UUID NOT NULL,
  "plate" VARCHAR(10) NOT NULL UNIQUE,
  "brand" VARCHAR(60) NOT NULL,
  "model" VARCHAR(60) NOT NULL,
  "year" SMALLINT NOT NULL,
  "color" VARCHAR(40),
  "mileage" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("customer_id") REFERENCES "customers" ("id")
);

CREATE TABLE "services" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "base_price" NUMERIC(10,2) NOT NULL,
  "estimated_time_min" INTEGER NOT NULL DEFAULT 60,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "parts" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(60) NOT NULL UNIQUE,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "min_stock" INTEGER NOT NULL DEFAULT 0,
  "unit" "Unit" NOT NULL DEFAULT 'UN',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "work_orders" (
  "id" UUID PRIMARY KEY,
  "number" VARCHAR(20) NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "assigned_user_id" UUID,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'RECEIVED',
  "problem_description" TEXT,
  "internal_notes" TEXT,
  "mileage_at_service" INTEGER,
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "approved_at" TIMESTAMP,
  "started_at" TIMESTAMP,
  "finished_at" TIMESTAMP,
  "delivered_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("customer_id") REFERENCES "customers" ("id"),
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id"),
  FOREIGN KEY ("assigned_user_id") REFERENCES "users" ("id")
);

CREATE TABLE "work_order_services" (
  "id" UUID PRIMARY KEY,
  "work_order_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "total_price" NUMERIC(10,2) NOT NULL,
  "status" "WorkOrderServiceStatus" NOT NULL DEFAULT 'PENDING',
  "started_at" TIMESTAMP,
  "finished_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id"),
  FOREIGN KEY ("service_id") REFERENCES "services" ("id")
);

CREATE TABLE "work_order_parts" (
  "id" UUID PRIMARY KEY,
  "work_order_id" UUID NOT NULL,
  "part_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "total_price" NUMERIC(10,2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id"),
  FOREIGN KEY ("part_id") REFERENCES "parts" ("id")
);

CREATE TABLE "quotes" (
  "id" UUID PRIMARY KEY,
  "work_order_id" UUID NOT NULL,
  "services_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "parts_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "sent_at" TIMESTAMP,
  "approved_at" TIMESTAMP,
  "rejected_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id")
);

CREATE TABLE "status_history" (
  "id" UUID PRIMARY KEY,
  "work_order_id" UUID NOT NULL,
  "changed_by_id" UUID,
  "previous_status" "WorkOrderStatus",
  "new_status" "WorkOrderStatus" NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id"),
  FOREIGN KEY ("changed_by_id") REFERENCES "users" ("id")
);

CREATE TABLE "stock_movements" (
  "id" UUID PRIMARY KEY,
  "part_id" UUID NOT NULL,
  "work_order_id" UUID,
  "type" "StockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" VARCHAR(255),
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("part_id") REFERENCES "parts" ("id"),
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders" ("id")
);
