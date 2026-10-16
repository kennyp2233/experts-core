-- Sync de coordinaciones Access → PG (fase 2 del reemplazo del sistema viejo,
-- ver docs/decisions/0003-replicar-legacy-datos-maestros.md).
--
-- 1) Vacía los documentos de prueba: a partir de esta migración el contenido
--    lo define el sync con Access. Los ids se reinician.
-- 2) Agrega la clave Access (`codigoAccess` / `numero`) a lotes, guías madre y
--    coordinaciones; lo que Access guarda y faltaba (totales, liquidación
--    normal y de corte extra, manifiesto, marcas, medidas, vuelos por tramo,
--    DAE por guía hija, datos por línea); relaja las FKs que Access no siempre
--    llena; siembra los tipos de caja y crea la bitácora del sync.

TRUNCATE TABLE
  "GuiaHijaDetalle", "GuiaHija", "DocumentoCosto", "DocumentoRuta",
  "DocumentoCoordinacion", "GuiaMadre", "DocumentoBase", "TipoCaja"
RESTART IDENTITY CASCADE;

-- CreateEnum
CREATE TYPE "EstadoLoteGuias" AS ENUM ('ANULADO', 'INGRESADO', 'GUIAS_COORDINADAS', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoGuiaMadre" AS ENUM ('INGRESADA', 'COORDINADA', 'PRESTADA');

-- CreateEnum
CREATE TYPE "TipoLiquidacion" AS ENUM ('NORMAL', 'CORTE_EXTRA');

-- AlterEnum
ALTER TYPE "EstadoCoordinacion" ADD VALUE 'ANULADO';

-- DropForeignKey
ALTER TABLE "GuiaHija" DROP CONSTRAINT "GuiaHija_idDocumentoCoordinacion_fkey";

-- DropForeignKey
ALTER TABLE "GuiaHijaDetalle" DROP CONSTRAINT "GuiaHijaDetalle_idGuiaHija_fkey";

-- DropForeignKey
ALTER TABLE "GuiaHijaDetalle" DROP CONSTRAINT "GuiaHijaDetalle_idTipoCaja_fkey";

-- AlterTable
ALTER TABLE "DocumentoBase" ADD COLUMN     "actualizadoEnLegacy" TIMESTAMP(3),
ADD COLUMN     "actualizadoPorLegacy" TEXT,
ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "creadoEnLegacy" TIMESTAMP(3),
ADD COLUMN     "creadoPorLegacy" TEXT,
ADD COLUMN     "estado" "EstadoLoteGuias",
ADD COLUMN     "nota" TEXT,
ADD COLUMN     "referencia" TEXT;

-- AlterTable
ALTER TABLE "GuiaMadre" ADD COLUMN     "coordinacionAccess" INTEGER,
ADD COLUMN     "estado" "EstadoGuiaMadre",
ADD COLUMN     "idAerolinea" INTEGER,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "virtual" BOOLEAN DEFAULT false,
ALTER COLUMN "prefijo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DocumentoCoordinacion" ADD COLUMN     "actualizadoEnLegacy" TIMESTAMP(3),
ADD COLUMN     "actualizadoPorLegacy" TEXT,
ADD COLUMN     "certificadoOrigen" TEXT,
ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "comision" DOUBLE PRECISION,
ADD COLUMN     "corteExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creadoEnLegacy" TIMESTAMP(3),
ADD COLUMN     "creadoPorLegacy" TEXT,
ADD COLUMN     "cupoFulls" DOUBLE PRECISION,
ADD COLUMN     "datosLegacy" JSONB,
ADD COLUMN     "idAerolinea" INTEGER,
ADD COLUMN     "idConsignatario" INTEGER,
ADD COLUMN     "idTipoEmbarque" INTEGER,
ADD COLUMN     "incentivo" DOUBLE PRECISION,
ADD COLUMN     "ingresoId" INTEGER,
ADD COLUMN     "liqDueAgent" DOUBLE PRECISION,
ADD COLUMN     "liqDueCarrier" DOUBLE PRECISION,
ADD COLUMN     "liqFlete" DOUBLE PRECISION,
ADD COLUMN     "liqFulls" DOUBLE PRECISION,
ADD COLUMN     "liqPesoBruto" DOUBLE PRECISION,
ADD COLUMN     "liqPesoCobrable" DOUBLE PRECISION,
ADD COLUMN     "liqPiezas" INTEGER,
ADD COLUMN     "liqTarifa" DOUBLE PRECISION,
ADD COLUMN     "liqTotal" DOUBLE PRECISION,
ADD COLUMN     "nota" TEXT,
ADD COLUMN     "numeroGuia" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "totalCajas" DOUBLE PRECISION,
ADD COLUMN     "totalFulls" DOUBLE PRECISION,
ADD COLUMN     "totalKgs" DOUBLE PRECISION,
ADD COLUMN     "totalVolumen" DOUBLE PRECISION,
ALTER COLUMN "idProducto" DROP NOT NULL,
ALTER COLUMN "idAgenciaIata" DROP NOT NULL,
ALTER COLUMN "idDestinoAwb" DROP NOT NULL,
ALTER COLUMN "idDestinoFinalDocs" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DocumentoRuta" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "fechaHoraLlegada" TIMESTAMP(3),
ADD COLUMN     "fechaHoraSalida" TIMESTAMP(3),
ADD COLUMN     "llegadaConfirmada" BOOLEAN,
ADD COLUMN     "llegadaTipo" TEXT,
ADD COLUMN     "salidaConfirmada" BOOLEAN,
ADD COLUMN     "salidaTipo" TEXT,
ADD COLUMN     "vuelo" TEXT;

-- AlterTable
ALTER TABLE "TipoCaja" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "GuiaHija" ADD COLUMN     "dae" TEXT,
ADD COLUMN     "idConsignatario" INTEGER,
ADD COLUMN     "totalFulls" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "idFinca" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GuiaHijaDetalle" ADD COLUMN     "alto" DOUBLE PRECISION,
ADD COLUMN     "ancho" DOUBLE PRECISION,
ADD COLUMN     "codigoProducto" TEXT,
ADD COLUMN     "dae" TEXT,
ADD COLUMN     "factura" TEXT,
ADD COLUMN     "fechaRegistro" TIMESTAMP(3),
ADD COLUMN     "fulls" DOUBLE PRECISION,
ADD COLUMN     "idConsignatario" INTEGER,
ADD COLUMN     "idFinca" INTEGER,
ADD COLUMN     "largo" DOUBLE PRECISION,
ADD COLUMN     "nota" TEXT,
ADD COLUMN     "numeroLinea" INTEGER,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "pesoKg" DOUBLE PRECISION,
ADD COLUMN     "secuencialLegacy" INTEGER,
ADD COLUMN     "tallos" INTEGER,
ADD COLUMN     "usuario" TEXT,
ADD COLUMN     "valor" DOUBLE PRECISION,
ALTER COLUMN "idProducto" DROP NOT NULL,
ALTER COLUMN "idTipoCaja" DROP NOT NULL,
ALTER COLUMN "ramosPorCaja" DROP NOT NULL,
ALTER COLUMN "tallosPorRamo" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DocumentoLiquidacion" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "tipo" "TipoLiquidacion" NOT NULL,
    "pesoCobrable" DOUBLE PRECISION,
    "tarifa" DOUBLE PRECISION,
    "guiaAerea" DOUBLE PRECISION,
    "combustible" DOUBLE PRECISION,
    "seguridad" DOUBLE PRECISION,
    "otros" DOUBLE PRECISION,
    "iva" DOUBLE PRECISION,
    "handling" DOUBLE PRECISION,
    "cargoAwa" DOUBLE PRECISION,
    "cargoCha" DOUBLE PRECISION,
    "cargoPca" DOUBLE PRECISION,
    "cargoTax" DOUBLE PRECISION,
    "cargoMma" DOUBLE PRECISION,
    "cargoHawb" DOUBLE PRECISION,
    "cargoFitos" DOUBLE PRECISION,
    "aux1" DOUBLE PRECISION,
    "aux2" DOUBLE PRECISION,
    "aux3Handling" DOUBLE PRECISION,
    "calAux" DOUBLE PRECISION,
    "auxOtros" DOUBLE PRECISION,
    "tarifaAcordada" DOUBLE PRECISION,
    "calculaPca" BOOLEAN,

    CONSTRAINT "DocumentoLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoManifiesto" (
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "origen" TEXT,
    "aduana" TEXT,
    "anio" TEXT,
    "tipo" TEXT,
    "numero" TEXT,
    "digitoVerificador" TEXT,
    "vuelo" TEXT,
    "fechaArribo" TEXT,
    "horaArribo" TEXT,
    "secuencial" TEXT,
    "referencia" TEXT,

    CONSTRAINT "DocumentoManifiesto_pkey" PRIMARY KEY ("idDocumentoCoordinacion")
);

-- CreateTable
CREATE TABLE "DocumentoMarca" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "idConsignatario" INTEGER,

    CONSTRAINT "DocumentoMarca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoMedida" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "largo" DOUBLE PRECISION,
    "ancho" DOUBLE PRECISION,
    "alto" DOUBLE PRECISION,
    "fulls" DOUBLE PRECISION,
    "piezas" INTEGER,
    "kgs" DOUBLE PRECISION,

    CONSTRAINT "DocumentoMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLegacyRegistro" (
    "id" SERIAL NOT NULL,
    "entidad" TEXT NOT NULL,
    "claveAccess" TEXT NOT NULL,
    "idPg" TEXT,
    "hash" TEXT NOT NULL,
    "vistoEn" TIMESTAMP(3) NOT NULL,
    "ausenteDesde" TIMESTAMP(3),

    CONSTRAINT "SyncLegacyRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoLiquidacion_idDocumentoCoordinacion_tipo_key" ON "DocumentoLiquidacion"("idDocumentoCoordinacion", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "SyncLegacyRegistro_entidad_claveAccess_key" ON "SyncLegacyRegistro"("entidad", "claveAccess");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoBase_codigoAccess_key" ON "DocumentoBase"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "GuiaMadre_numero_key" ON "GuiaMadre"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCoordinacion_codigoAccess_key" ON "DocumentoCoordinacion"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCaja_codigo_key" ON "TipoCaja"("codigo");

-- CreateIndex
CREATE INDEX "GuiaHija_numeroGuiaHija_idx" ON "GuiaHija"("numeroGuiaHija");

-- CreateIndex
CREATE INDEX "GuiaHija_dae_idx" ON "GuiaHija"("dae");

-- AddForeignKey
ALTER TABLE "DocumentoLiquidacion" ADD CONSTRAINT "DocumentoLiquidacion_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoManifiesto" ADD CONSTRAINT "DocumentoManifiesto_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoMarca" ADD CONSTRAINT "DocumentoMarca_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoMedida" ADD CONSTRAINT "DocumentoMedida_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHija" ADD CONSTRAINT "GuiaHija_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHijaDetalle" ADD CONSTRAINT "GuiaHijaDetalle_idGuiaHija_fkey" FOREIGN KEY ("idGuiaHija") REFERENCES "GuiaHija"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHijaDetalle" ADD CONSTRAINT "GuiaHijaDetalle_idTipoCaja_fkey" FOREIGN KEY ("idTipoCaja") REFERENCES "TipoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tipos de caja (factor = fulls por caja). Se deducen de fulls/cajas de cada línea.
INSERT INTO "TipoCaja" ("codigo", "nombre", "factorFull") VALUES
  ('FB', 'Full', 1),
  ('HB', 'Tabaco', 0.5),
  ('QB', 'Cuarto', 0.25),
  ('EB', 'Octavo', 0.125);
