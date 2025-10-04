-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qrCodeUsed" TEXT,
    "exceptionCode" TEXT,
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
INSERT INTO "new_attendance_records" ("accuracy", "attendanceId", "createdAt", "createdOffline", "deviceId", "id", "latitude", "longitude", "photoMetadata", "photoPath", "processedAt", "qrCodeUsed", "status", "syncedAt", "timestamp", "type", "updatedAt", "validationErrors", "workerId") SELECT "accuracy", "attendanceId", "createdAt", "createdOffline", "deviceId", "id", "latitude", "longitude", "photoMetadata", "photoPath", "processedAt", "qrCodeUsed", "status", "syncedAt", "timestamp", "type", "updatedAt", "validationErrors", "workerId" FROM "attendance_records";
DROP TABLE "attendance_records";
ALTER TABLE "new_attendance_records" RENAME TO "attendance_records";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
