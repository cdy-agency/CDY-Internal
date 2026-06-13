-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '6366F1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureIncome" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "VentureIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureExpense" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "ventureShare" DECIMAL(5,2) NOT NULL,
    "ventureAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" "ExpenseCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "cdyShare" DECIMAL(5,2),
    "receiptUrl" TEXT,
    "notes" TEXT,
    "expenseId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "VentureExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venture_name_key" ON "Venture"("name");

-- CreateIndex
CREATE INDEX "Venture_isActive_idx" ON "Venture"("isActive");

-- CreateIndex
CREATE INDEX "VentureIncome_ventureId_idx" ON "VentureIncome"("ventureId");

-- CreateIndex
CREATE INDEX "VentureIncome_date_idx" ON "VentureIncome"("date");

-- CreateIndex
CREATE INDEX "VentureIncome_category_idx" ON "VentureIncome"("category");

-- CreateIndex
CREATE INDEX "VentureExpense_ventureId_idx" ON "VentureExpense"("ventureId");

-- CreateIndex
CREATE INDEX "VentureExpense_date_idx" ON "VentureExpense"("date");

-- CreateIndex
CREATE INDEX "VentureExpense_category_idx" ON "VentureExpense"("category");

-- CreateIndex
CREATE INDEX "VentureExpense_isShared_idx" ON "VentureExpense"("isShared");

-- CreateIndex
CREATE INDEX "VentureExpense_expenseId_idx" ON "VentureExpense"("expenseId");

-- AddForeignKey
ALTER TABLE "VentureIncome" ADD CONSTRAINT "VentureIncome_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureExpense" ADD CONSTRAINT "VentureExpense_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
