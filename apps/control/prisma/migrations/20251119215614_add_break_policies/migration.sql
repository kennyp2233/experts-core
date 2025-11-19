-- CreateTable
CREATE TABLE "break_policies" (
    "id" UUID NOT NULL,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "level" "ConfigLevel" NOT NULL,
    "entityId" UUID,
    "breakRulesJson" JSONB NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "break_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "break_policies_level_isActive_idx" ON "break_policies"("level", "isActive");

-- CreateIndex
CREATE INDEX "break_policies_entityId_idx" ON "break_policies"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "break_policies_level_entityId_key" ON "break_policies"("level", "entityId");
