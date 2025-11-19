-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "LoginQRStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExceptionCodeStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConfigLevel" AS ENUM ('GLOBAL', 'DEPOT', 'WORKER');

-- CreateEnum
CREATE TYPE "ExceptionReason" AS ENUM ('HOLIDAY', 'SPECIAL_EVENT', 'OVERTIME', 'MAINTENANCE', 'EMERGENCY');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPERVISOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_login_qrs" (
    "id" UUID NOT NULL,
    "qrToken" VARCHAR(255) NOT NULL,
    "shortCode" VARCHAR(6),
    "status" "LoginQRStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3),
    "usedAt" TIMESTAMPTZ(3),
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workerId" UUID NOT NULL,
    "adminId" UUID NOT NULL,

    CONSTRAINT "worker_login_qrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depots" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius" SMALLINT NOT NULL DEFAULT 100,
    "secret" VARCHAR(255) NOT NULL,
    "secretUpdatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "depots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "profilePhoto" TEXT,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "depotId" UUID NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "model" VARCHAR(100),
    "platform" VARCHAR(20),
    "appVersion" VARCHAR(20),
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" VARCHAR(255),
    "sessionExpiry" TIMESTAMPTZ(3),
    "lastActivityAt" TIMESTAMPTZ(3),
    "lastUsedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workerId" UUID NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "entryTime" TIMESTAMPTZ(3),
    "exitTime" TIMESTAMPTZ(3),
    "totalHours" DECIMAL(5,2),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workerId" UUID NOT NULL,
    "depotId" UUID NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "qrCodeUsed" TEXT,
    "exceptionCode" VARCHAR(10),
    "photoPath" TEXT NOT NULL,
    "photoMetadata" JSONB,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "accuracy" DECIMAL(8,2),
    "validationErrors" JSONB,
    "fraudScore" SMALLINT,
    "processedAt" TIMESTAMPTZ(3),
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workerId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_qr_codes" (
    "id" UUID NOT NULL,
    "hash" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "depotId" UUID NOT NULL,

    CONSTRAINT "attendance_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exception_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "status" "ExceptionCodeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workerId" UUID NOT NULL,
    "adminId" UUID NOT NULL,

    CONSTRAINT "exception_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_validation_configs" (
    "id" UUID NOT NULL,
    "level" "ConfigLevel" NOT NULL,
    "entityId" UUID,
    "configJson" JSONB NOT NULL,
    "description" TEXT,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fraud_validation_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledForDepots" JSONB,
    "enabledForWorkers" JSONB,
    "disabledForDepots" JSONB,
    "disabledForWorkers" JSONB,
    "description" TEXT,
    "category" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "entryStart" VARCHAR(5) NOT NULL,
    "entryEnd" VARCHAR(5) NOT NULL,
    "exitStart" VARCHAR(5) NOT NULL,
    "exitEnd" VARCHAR(5) NOT NULL,
    "entryToleranceMinutes" SMALLINT NOT NULL DEFAULT 15,
    "exitToleranceMinutes" SMALLINT NOT NULL DEFAULT 15,
    "daysOfWeek" JSONB NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Guayaquil',
    "isStrict" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "depotId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_schedule_assignments" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "customEntryStart" VARCHAR(5),
    "customEntryEnd" VARCHAR(5),
    "customExitStart" VARCHAR(5),
    "customExitEnd" VARCHAR(5),
    "customEntryTolerance" SMALLINT,
    "customExitTolerance" SMALLINT,
    "customDaysOfWeek" JSONB,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "worker_schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "reason" "ExceptionReason" NOT NULL,
    "entryStart" VARCHAR(5),
    "entryEnd" VARCHAR(5),
    "exitStart" VARCHAR(5),
    "exitEnd" VARCHAR(5),
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_weight_configs" (
    "id" UUID NOT NULL,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "level" "ConfigLevel" NOT NULL,
    "entityId" UUID,
    "weightsJson" JSONB NOT NULL,
    "lowRiskThreshold" SMALLINT NOT NULL DEFAULT 20,
    "mediumRiskThreshold" SMALLINT NOT NULL DEFAULT 60,
    "highRiskThreshold" SMALLINT NOT NULL DEFAULT 100,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fraud_weight_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_username_idx" ON "admins"("username");

-- CreateIndex
CREATE INDEX "admins_isActive_idx" ON "admins"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "worker_login_qrs_qrToken_key" ON "worker_login_qrs"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "worker_login_qrs_shortCode_key" ON "worker_login_qrs"("shortCode");

-- CreateIndex
CREATE INDEX "worker_login_qrs_workerId_idx" ON "worker_login_qrs"("workerId");

-- CreateIndex
CREATE INDEX "worker_login_qrs_adminId_idx" ON "worker_login_qrs"("adminId");

-- CreateIndex
CREATE INDEX "worker_login_qrs_status_idx" ON "worker_login_qrs"("status");

-- CreateIndex
CREATE INDEX "worker_login_qrs_expiresAt_idx" ON "worker_login_qrs"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "depots_secret_key" ON "depots"("secret");

-- CreateIndex
CREATE INDEX "depots_isActive_idx" ON "depots"("isActive");

-- CreateIndex
CREATE INDEX "depots_name_idx" ON "depots"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workers_employeeId_key" ON "workers"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_email_key" ON "workers"("email");

-- CreateIndex
CREATE INDEX "workers_depotId_idx" ON "workers"("depotId");

-- CreateIndex
CREATE INDEX "workers_employeeId_idx" ON "workers"("employeeId");

-- CreateIndex
CREATE INDEX "workers_email_idx" ON "workers"("email");

-- CreateIndex
CREATE INDEX "workers_status_idx" ON "workers"("status");

-- CreateIndex
CREATE INDEX "workers_isAuthenticated_idx" ON "workers"("isAuthenticated");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_sessionToken_key" ON "devices"("sessionToken");

-- CreateIndex
CREATE INDEX "devices_workerId_idx" ON "devices"("workerId");

-- CreateIndex
CREATE INDEX "devices_deviceId_idx" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_isLoggedIn_idx" ON "devices"("isLoggedIn");

-- CreateIndex
CREATE INDEX "attendances_workerId_date_idx" ON "attendances"("workerId", "date");

-- CreateIndex
CREATE INDEX "attendances_depotId_date_idx" ON "attendances"("depotId", "date");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "attendances_isComplete_idx" ON "attendances"("isComplete");

-- CreateIndex
CREATE INDEX "attendance_records_workerId_timestamp_idx" ON "attendance_records"("workerId", "timestamp");

-- CreateIndex
CREATE INDEX "attendance_records_attendanceId_idx" ON "attendance_records"("attendanceId");

-- CreateIndex
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- CreateIndex
CREATE INDEX "attendance_records_type_idx" ON "attendance_records"("type");

-- CreateIndex
CREATE INDEX "attendance_records_fraudScore_idx" ON "attendance_records"("fraudScore");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_codes_hash_key" ON "attendance_qr_codes"("hash");

-- CreateIndex
CREATE INDEX "attendance_qr_codes_depotId_idx" ON "attendance_qr_codes"("depotId");

-- CreateIndex
CREATE INDEX "attendance_qr_codes_expiresAt_idx" ON "attendance_qr_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "attendance_qr_codes_isUsed_idx" ON "attendance_qr_codes"("isUsed");

-- CreateIndex
CREATE UNIQUE INDEX "exception_codes_code_key" ON "exception_codes"("code");

-- CreateIndex
CREATE INDEX "exception_codes_workerId_idx" ON "exception_codes"("workerId");

-- CreateIndex
CREATE INDEX "exception_codes_adminId_idx" ON "exception_codes"("adminId");

-- CreateIndex
CREATE INDEX "exception_codes_status_idx" ON "exception_codes"("status");

-- CreateIndex
CREATE INDEX "exception_codes_expiresAt_idx" ON "exception_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "fraud_validation_configs_level_idx" ON "fraud_validation_configs"("level");

-- CreateIndex
CREATE INDEX "fraud_validation_configs_isActive_idx" ON "fraud_validation_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_validation_configs_level_entityId_key" ON "fraud_validation_configs"("level", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "feature_flags_name_idx" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "work_schedules_depotId_idx" ON "work_schedules"("depotId");

-- CreateIndex
CREATE INDEX "work_schedules_isActive_idx" ON "work_schedules"("isActive");

-- CreateIndex
CREATE INDEX "worker_schedule_assignments_workerId_idx" ON "worker_schedule_assignments"("workerId");

-- CreateIndex
CREATE INDEX "worker_schedule_assignments_scheduleId_idx" ON "worker_schedule_assignments"("scheduleId");

-- CreateIndex
CREATE INDEX "worker_schedule_assignments_effectiveFrom_effectiveTo_idx" ON "worker_schedule_assignments"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "worker_schedule_assignments_workerId_scheduleId_effectiveFr_key" ON "worker_schedule_assignments"("workerId", "scheduleId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "schedule_exceptions_scheduleId_idx" ON "schedule_exceptions"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_date_idx" ON "schedule_exceptions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exceptions_scheduleId_date_key" ON "schedule_exceptions"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "fraud_weight_configs_level_idx" ON "fraud_weight_configs"("level");

-- CreateIndex
CREATE INDEX "fraud_weight_configs_isActive_idx" ON "fraud_weight_configs"("isActive");

-- CreateIndex
CREATE INDEX "fraud_weight_configs_effectiveFrom_effectiveTo_idx" ON "fraud_weight_configs"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_weight_configs_level_entityId_version_key" ON "fraud_weight_configs"("level", "entityId", "version");

-- AddForeignKey
ALTER TABLE "worker_login_qrs" ADD CONSTRAINT "worker_login_qrs_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_login_qrs" ADD CONSTRAINT "worker_login_qrs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_codes" ADD CONSTRAINT "attendance_qr_codes_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_codes" ADD CONSTRAINT "exception_codes_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_codes" ADD CONSTRAINT "exception_codes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_schedule_assignments" ADD CONSTRAINT "worker_schedule_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_schedule_assignments" ADD CONSTRAINT "worker_schedule_assignments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
