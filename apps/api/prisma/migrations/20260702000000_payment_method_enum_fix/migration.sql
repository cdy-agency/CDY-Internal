-- AlterEnum: add missing values to PaymentMethod
-- MTN_MOMO, AIRTEL_MONEY, and OTHER were in schema.prisma and shared types
-- but were never added to the PostgreSQL enum after the initial migration.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MTN_MOMO';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'AIRTEL_MONEY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';
