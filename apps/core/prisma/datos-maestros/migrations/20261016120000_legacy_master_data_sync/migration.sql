-- Sync de datos maestros Access → PG.
--
-- 1) Vacía los datos maestros cargados a mano: a partir de esta migración el
--    contenido de estas tablas lo define el sync con Access (decisión del
--    2026-10-16). Los ids se reinician.
-- 2) Agrega las columnas de clave Access (`codigoAccess` / `codigo`), los campos
--    con datos en Access que no tenían dónde ir, tablas nuevas (componentes de
--    producto, otros destinos, registro Agrocalidad, tipos de documento,
--    parámetros) y la bitácora del sync.

-- Vaciado
TRUNCATE TABLE
  "ConceptoCosto", "AerolineasPlantilla", "AerolineaRuta", "Aerolinea",
  "ConsignatarioCaeSice", "ConsignatarioFacturacion", "ConsignatarioFito",
  "ConsignatarioGuiaH", "ConsignatarioGuiaM", "ConsignatarioTransmision", "Consignatario",
  "FincaChofer", "FincaProducto", "Finca", "Chofer",
  "ProductosAranceles", "ProductosCompuesto", "ProductosMiPro", "Producto", "Medida",
  "Destino", "Origen", "CaeAduana", "Pais", "AcuerdoArancelario",
  "Embarcador", "Cliente", "AgenciaIata", "SubAgencia", "Bodeguero", "FuncionarioAgrocalidad",
  "TipoEmbarque", "TipoCarga", "TipoEmbalaje"
RESTART IDENTITY CASCADE;

-- DropForeignKey
ALTER TABLE "Destino" DROP CONSTRAINT "Destino_idPais_fkey";

-- DropForeignKey
ALTER TABLE "Consignatario" DROP CONSTRAINT "Consignatario_idEmbarcador_fkey";

-- DropForeignKey
ALTER TABLE "Consignatario" DROP CONSTRAINT "Consignatario_idCliente_fkey";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "referencia" TEXT;

-- AlterTable
ALTER TABLE "ProductosAranceles" ADD COLUMN     "idOtroDestino" INTEGER;

-- AlterTable
ALTER TABLE "ProductosMiPro" ADD COLUMN     "idAcuerdo" INTEGER;

-- AlterTable
ALTER TABLE "Medida" ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "impresion" TEXT;

-- AlterTable
ALTER TABLE "FuncionarioAgrocalidad" ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "Embarcador" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "AcuerdoArancelario" ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "criterioOrigen" TEXT,
ADD COLUMN     "descripcionDefault" TEXT,
ADD COLUMN     "djoCodeDefault" TEXT,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tariffCodeDefault" TEXT,
ADD COLUMN     "tipoAcuerdo" TEXT,
ADD COLUMN     "tipoCertificado" TEXT;

-- AlterTable
ALTER TABLE "Destino" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "idPais" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Origen" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CaeAduana" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "Consignatario" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "paisSigla" TEXT,
ALTER COLUMN "idEmbarcador" DROP NOT NULL,
ALTER COLUMN "idCliente" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ConsignatarioFito" ADD COLUMN     "fitoDeclaredAddress" TEXT;

-- AlterTable
ALTER TABLE "ConsignatarioTransmision" ADD COLUMN     "consigneeSiglasPaisTrans" TEXT,
ADD COLUMN     "hawbSiglasPaisTrans" TEXT,
ADD COLUMN     "notifySiglasPaisTrans" TEXT;

-- AlterTable
ALTER TABLE "FincaProducto" ADD COLUMN     "nombre" TEXT;

-- AlterTable
ALTER TABLE "Finca" ADD COLUMN     "cajaAlto" DOUBLE PRECISION,
ADD COLUMN     "cajaAncho" DOUBLE PRECISION,
ADD COLUMN     "cajaLargo" DOUBLE PRECISION,
ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "direccion" TEXT;

-- AlterTable
ALTER TABLE "Chofer" ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "Bodeguero" ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "Aerolinea" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER,
ADD COLUMN     "leyenda" TEXT,
ADD COLUMN     "reservasAsunto" TEXT,
ADD COLUMN     "reservasDestinatarios" TEXT,
ADD COLUMN     "reservasNombreContacto" TEXT;

-- AlterTable
ALTER TABLE "AgenciaIata" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "SubAgencia" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "codigoAccess" INTEGER;

-- AlterTable
ALTER TABLE "TipoEmbarque" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "descripcionGuia" TEXT,
ADD COLUMN     "orden" INTEGER;

-- AlterTable
ALTER TABLE "TipoCarga" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "TipoEmbalaje" ADD COLUMN     "codigo" TEXT;

-- CreateTable
CREATE TABLE "ProductoComponente" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "componenteId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "stems" INTEGER,

    CONSTRAINT "ProductoComponente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtroDestino" (
    "id" SERIAL NOT NULL,
    "codigoAccess" INTEGER,
    "nombre" TEXT NOT NULL,
    "plantillaModo" INTEGER,
    "plantillaNombre" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OtroDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAgrocalidad" (
    "id" SERIAL NOT NULL,
    "codigoAccess" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "provincia" TEXT,
    "canton" TEXT,
    "direccion" TEXT,
    "strCod" TEXT,
    "idFinca" INTEGER,

    CONSTRAINT "RegistroAgrocalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDocumentoIdentidad" (
    "id" SERIAL NOT NULL,
    "codigo" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoDocumentoIdentidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "clave" TEXT NOT NULL,
    "descripcion" TEXT,
    "valorNumero" DOUBLE PRECISION,
    "valorTexto" TEXT,
    "fuente" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("clave")
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

-- CreateTable
CREATE TABLE "SyncLegacyEjecucion" (
    "id" SERIAL NOT NULL,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),
    "grupo" TEXT NOT NULL DEFAULT 'maestros',
    "modo" TEXT,
    "estado" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "forzado" BOOLEAN NOT NULL DEFAULT false,
    "origen" TEXT NOT NULL,
    "resumen" JSONB,
    "error" TEXT,

    CONSTRAINT "SyncLegacyEjecucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductoComponente_productId_orden_key" ON "ProductoComponente"("productId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "OtroDestino_codigoAccess_key" ON "OtroDestino"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAgrocalidad_codigoAccess_key" ON "RegistroAgrocalidad"("codigoAccess");

-- CreateIndex
CREATE INDEX "RegistroAgrocalidad_codigo_idx" ON "RegistroAgrocalidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoDocumentoIdentidad_codigo_key" ON "TipoDocumentoIdentidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SyncLegacyRegistro_entidad_claveAccess_key" ON "SyncLegacyRegistro"("entidad", "claveAccess");

-- CreateIndex
CREATE INDEX "SyncLegacyEjecucion_iniciadoEn_idx" ON "SyncLegacyEjecucion"("iniciadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Medida_codigoAccess_key" ON "Medida"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "FuncionarioAgrocalidad_codigoAccess_key" ON "FuncionarioAgrocalidad"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Embarcador_codigoAccess_key" ON "Embarcador"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "AcuerdoArancelario_codigoAccess_key" ON "AcuerdoArancelario"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Destino_codigo_key" ON "Destino"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Origen_codigo_key" ON "Origen"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CaeAduana_codigo_key" ON "CaeAduana"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigoAccess_key" ON "Cliente"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Consignatario_codigoAccess_key" ON "Consignatario"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Finca_codigoAccess_key" ON "Finca"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Chofer_codigoAccess_key" ON "Chofer"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Bodeguero_codigoAccess_key" ON "Bodeguero"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Aerolinea_codigoAccess_key" ON "Aerolinea"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "AgenciaIata_codigoAccess_key" ON "AgenciaIata"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "SubAgencia_codigoAccess_key" ON "SubAgencia"("codigoAccess");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEmbarque_codigo_key" ON "TipoEmbarque"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCarga_codigo_key" ON "TipoCarga"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEmbalaje_codigo_key" ON "TipoEmbalaje"("codigo");

-- AddForeignKey
ALTER TABLE "ProductosAranceles" ADD CONSTRAINT "ProductosAranceles_idOtroDestino_fkey" FOREIGN KEY ("idOtroDestino") REFERENCES "OtroDestino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductosMiPro" ADD CONSTRAINT "ProductosMiPro_idAcuerdo_fkey" FOREIGN KEY ("idAcuerdo") REFERENCES "AcuerdoArancelario"("idAcuerdo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoComponente" ADD CONSTRAINT "ProductoComponente_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoComponente" ADD CONSTRAINT "ProductoComponente_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destino" ADD CONSTRAINT "Destino_idPais_fkey" FOREIGN KEY ("idPais") REFERENCES "Pais"("idPais") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignatario" ADD CONSTRAINT "Consignatario_idEmbarcador_fkey" FOREIGN KEY ("idEmbarcador") REFERENCES "Embarcador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignatario" ADD CONSTRAINT "Consignatario_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAgrocalidad" ADD CONSTRAINT "RegistroAgrocalidad_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES "Finca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
