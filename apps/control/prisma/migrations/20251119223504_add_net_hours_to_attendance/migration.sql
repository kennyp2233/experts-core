-- AlterTable
ALTER TABLE "attendances" ADD COLUMN "breakMinutes" SMALLINT;

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN "netHours" DECIMAL(5,2);

-- Update comments
COMMENT ON COLUMN "attendances"."totalHours" IS 'Horas brutas (exit - entry)';
COMMENT ON COLUMN "attendances"."breakMinutes" IS 'Minutos de break deducidos';
COMMENT ON COLUMN "attendances"."netHours" IS 'Horas netas (totalHours - breaks)';
