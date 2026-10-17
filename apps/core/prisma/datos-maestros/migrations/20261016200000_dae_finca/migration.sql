-- Registro de DAEs del sistema viejo (awbm_auxdaes): la DAE de cada finca por
-- origen, país de destino y período. Lo llena el sync; al coordinar se propone
-- la vigente para la fecha de vuelo.
CREATE TABLE "DaeFinca" (
    "id" SERIAL NOT NULL,
    "codigoAccess" INTEGER NOT NULL,
    "idFinca" INTEGER,
    "origen" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "fechaAceptacion" DATE,
    "dae" TEXT NOT NULL,
    "zonaPrimaria" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "registradoPor" TEXT,
    "registradoEn" TIMESTAMP(3),

    CONSTRAINT "DaeFinca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DaeFinca_codigoAccess_key" ON "DaeFinca"("codigoAccess");

-- CreateIndex
CREATE INDEX "DaeFinca_idFinca_origen_pais_idx" ON "DaeFinca"("idFinca", "origen", "pais");

-- AddForeignKey
ALTER TABLE "DaeFinca" ADD CONSTRAINT "DaeFinca_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES "Finca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
