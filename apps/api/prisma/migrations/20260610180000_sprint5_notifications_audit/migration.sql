-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVOICE_OVERDUE', 'INVOICE_REMINDER_SENT', 'INVOICE_PAID', 'BILL_DUE_SOON', 'BILL_OVERDUE', 'PAYMENT_RECEIVED', 'COMMISSION_APPROVED', 'COMMISSION_REJECTED', 'REMINDER_FAILED', 'BUDGET_ALERT', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowAdjustment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashFlowAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceAuditLog_userId_idx" ON "FinanceAuditLog"("userId");

-- CreateIndex
CREATE INDEX "FinanceAuditLog_entityType_idx" ON "FinanceAuditLog"("entityType");

-- CreateIndex
CREATE INDEX "FinanceAuditLog_entityId_idx" ON "FinanceAuditLog"("entityId");

-- CreateIndex
CREATE INDEX "FinanceAuditLog_createdAt_idx" ON "FinanceAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CashFlowAdjustment_date_idx" ON "CashFlowAdjustment"("date");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
