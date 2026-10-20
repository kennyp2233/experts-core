-- N° propio de las coordinaciones del sistema nuevo (las de Access usan codigoAccess)
-- y constancia de las anuladas (quién, cuándo y qué tenían).

-- AlterTable
ALTER TABLE "DocumentoCoordinacion" ADD COLUMN "numero" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCoordinacion_numero_key" ON "DocumentoCoordinacion"("numero");

-- Las coordinaciones ya creadas en el sistema nuevo toman N° desde 900.000 (rango
-- del modo sombra, como CGU-0900000), en el orden en que se crearon.
UPDATE "DocumentoCoordinacion" d
SET "numero" = 899999 + n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS rn
  FROM "DocumentoCoordinacion"
  WHERE "codigoAccess" IS NULL
) n
WHERE d."id" = n."id";

INSERT INTO "Contador" ("clave", "valor", "updatedAt")
SELECT 'coordinacion', MAX("numero"), now() FROM "DocumentoCoordinacion" WHERE "numero" IS NOT NULL
HAVING MAX("numero") IS NOT NULL
ON CONFLICT ("clave") DO NOTHING;

-- CreateTable
CREATE TABLE "CoordinacionAnulada" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "numero" INTEGER,
    "numeroGuia" TEXT,
    "idConsignatario" INTEGER,
    "idAerolinea" INTEGER,
    "fechaVuelo" TIMESTAMP(3) NOT NULL,
    "totalFulls" DOUBLE PRECISION,
    "totalCajas" DOUBLE PRECISION,
    "totalKgs" DOUBLE PRECISION,
    "motivo" TEXT,
    "anuladoPor" TEXT,
    "anuladoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datos" JSONB NOT NULL,

    CONSTRAINT "CoordinacionAnulada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoordinacionAnulada_fechaVuelo_idx" ON "CoordinacionAnulada"("fechaVuelo");
