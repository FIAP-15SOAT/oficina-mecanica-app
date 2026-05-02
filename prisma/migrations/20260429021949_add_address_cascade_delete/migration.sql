-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_customer_id_fkey";

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
