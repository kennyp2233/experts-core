-- CreateTable
CREATE TABLE "fraud_validation_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "entityId" TEXT,
    "configJson" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledForDepots" TEXT,
    "enabledForWorkers" TEXT,
    "disabledForDepots" TEXT,
    "disabledForWorkers" TEXT,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entryStart" TEXT NOT NULL,
    "entryEnd" TEXT NOT NULL,
    "exitStart" TEXT NOT NULL,
    "exitEnd" TEXT NOT NULL,
    "entryToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "exitToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "daysOfWeek" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "isStrict" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "depotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "work_schedules_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "worker_schedule_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "customEntryStart" TEXT,
    "customEntryEnd" TEXT,
    "customExitStart" TEXT,
    "customExitEnd" TEXT,
    "customEntryTolerance" INTEGER,
    "customExitTolerance" INTEGER,
    "customDaysOfWeek" TEXT,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "worker_schedule_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "worker_schedule_assignments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "work_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "entryStart" TEXT,
    "entryEnd" TEXT,
    "exitStart" TEXT,
    "exitEnd" TEXT,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedule_exceptions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "work_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fraud_weight_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL,
    "entityId" TEXT,
    "weightsJson" TEXT NOT NULL,
    "lowRiskThreshold" INTEGER NOT NULL DEFAULT 20,
    "mediumRiskThreshold" INTEGER NOT NULL DEFAULT 60,
    "highRiskThreshold" INTEGER NOT NULL DEFAULT 100,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "fraud_validation_configs_level_entityId_key" ON "fraud_validation_configs"("level", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "worker_schedule_assignments_workerId_scheduleId_effectiveFrom_key" ON "worker_schedule_assignments"("workerId", "scheduleId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exceptions_scheduleId_date_key" ON "schedule_exceptions"("scheduleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_weight_configs_level_entityId_version_key" ON "fraud_weight_configs"("level", "entityId", "version");
