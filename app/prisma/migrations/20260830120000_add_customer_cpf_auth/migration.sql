-- Users: CPF (nullable, unique) and optional internal role
ALTER TABLE "users" ADD COLUMN "cpf" VARCHAR(11);
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- Customers: active flag, defaults true so existing rows are unaffected
ALTER TABLE "customers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- UserCustomer: many-to-many access grant
CREATE TABLE "user_customers" (
    "user_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_customers_pkey" PRIMARY KEY ("user_id","customer_id")
);

CREATE INDEX "user_customers_customer_id_idx" ON "user_customers"("customer_id");

ALTER TABLE "user_customers" ADD CONSTRAINT "user_customers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_customers" ADD CONSTRAINT "user_customers_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PasswordResetCode: 1:1 with users, hashed code
CREATE TABLE "password_reset_codes" (
    "user_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
