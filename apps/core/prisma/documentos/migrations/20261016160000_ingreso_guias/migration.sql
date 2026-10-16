-- Ingreso de guías (documento CGU del sistema viejo): número propio y guías anuladas.

-- AlterEnum
ALTER TYPE "EstadoGuiaMadre" ADD VALUE 'ANULADA';

-- AlterTable
ALTER TABLE "DocumentoBase" ADD COLUMN "numero" INTEGER;

-- Los ingresos que vienen del sistema viejo usan su mismo número.
UPDATE "DocumentoBase" SET "numero" = "codigoAccess" WHERE "codigoAccess" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoBase_numero_key" ON "DocumentoBase"("numero");
