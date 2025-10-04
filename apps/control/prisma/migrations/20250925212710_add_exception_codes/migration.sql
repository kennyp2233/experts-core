-- CreateTable
CREATE TABLE "exception_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    CONSTRAINT "exception_codes_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exception_codes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "exception_codes_code_key" ON "exception_codes"("code");
