-- Rename table addresses → customer_addresses
ALTER TABLE "addresses" RENAME TO "customer_addresses";

-- Rename primary key constraint
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "addresses_pkey" TO "customer_addresses_pkey";

-- Rename foreign key constraint
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "addresses_customer_id_fkey" TO "customer_addresses_customer_id_fkey";
