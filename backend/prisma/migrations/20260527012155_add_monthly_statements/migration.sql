-- CreateTable
CREATE TABLE "monthly_statements" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "total_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cash_in" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cash_out" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "top_products_json" JSONB NOT NULL,
    "by_category_json" JSONB NOT NULL,
    "by_payment_json" JSONB NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_statements_month_key" ON "monthly_statements"("month");

-- CreateIndex
CREATE INDEX "monthly_statements_month_idx" ON "monthly_statements"("month");
