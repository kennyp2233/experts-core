-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "worker_login_qrs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "qrToken" TEXT NOT NULL,
    "shortCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "deviceInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    CONSTRAINT "worker_login_qrs_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "worker_login_qrs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "secret" TEXT NOT NULL,
    "secretUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "profilePhoto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "depotId" TEXT NOT NULL,
    CONSTRAINT "workers_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "model" TEXT,
    "platform" TEXT,
    "appVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" TEXT,
    "sessionExpiry" DATETIME,
    "lastActivityAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    CONSTRAINT "devices_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "entryTime" DATETIME,
    "exitTime" DATETIME,
    "totalHours" REAL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    CONSTRAINT "attendances_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendances_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qrCodeUsed" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoMetadata" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "accuracy" REAL,
    "validationErrors" TEXT,
    "processedAt" DATETIME,
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    CONSTRAINT "attendance_records_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_qr_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "depotId" TEXT NOT NULL,
    CONSTRAINT "attendance_qr_codes_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "worker_login_qrs_qrToken_key" ON "worker_login_qrs"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "worker_login_qrs_shortCode_key" ON "worker_login_qrs"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "depots_secret_key" ON "depots"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "workers_employeeId_key" ON "workers"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_email_key" ON "workers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_sessionToken_key" ON "devices"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_codes_hash_key" ON "attendance_qr_codes"("hash");
