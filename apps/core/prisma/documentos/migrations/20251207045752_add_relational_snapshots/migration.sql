-- CreateEnum
CREATE TYPE "TipoConcepto" AS ENUM ('COSTO_GUIA', 'COMBUSTIBLE', 'SEGURIDAD', 'AUX_CALCULO', 'IVA', 'OTROS', 'AUX1', 'AUX2');

-- CreateEnum
CREATE TYPE "TipoMultiplicador" AS ENUM ('GROSS_WEIGHT', 'CHARGEABLE_WEIGHT');

-- CreateEnum
CREATE TYPE "TipoRuta" AS ENUM ('ORIGEN', 'DESTINO1', 'VIA1', 'DESTINO2', 'VIA2', 'DESTINO3', 'VIA3');

-- CreateTable
CREATE TABLE "DocumentoCoordinacion" (
    "id" SERIAL NOT NULL,
    "idGuiaMadre" INTEGER NOT NULL,
    "tarifaRate" DOUBLE PRECISION DEFAULT 0,
    "pca" DOUBLE PRECISION DEFAULT 0,
    "plantillaGuiaMadre" TEXT,
    "plantillaFormatoAerolinea" TEXT,
    "plantillaReservas" TEXT,
    "idProducto" INTEGER NOT NULL,
    "idAgenciaIata" INTEGER NOT NULL,
    "idDestinoAwb" INTEGER NOT NULL,
    "idDestinoFinalDocs" INTEGER NOT NULL,
    "idEstadoActual" INTEGER NOT NULL,
    "pago" TEXT NOT NULL DEFAULT 'PREPAID',
    "fechaVuelo" TIMESTAMP(3) NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoCoordinacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoRuta" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "tipoRuta" "TipoRuta" NOT NULL,
    "origenId" INTEGER,
    "destinoId" INTEGER,
    "viaAerolineaId" INTEGER,
    "orden" INTEGER,

    CONSTRAINT "DocumentoRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoCosto" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "tipo" "TipoConcepto" NOT NULL,
    "abreviatura" TEXT,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplicador" "TipoMultiplicador",

    CONSTRAINT "DocumentoCosto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCoordinacion_idGuiaMadre_key" ON "DocumentoCoordinacion"("idGuiaMadre");

-- AddForeignKey
ALTER TABLE "DocumentoCoordinacion" ADD CONSTRAINT "DocumentoCoordinacion_idGuiaMadre_fkey" FOREIGN KEY ("idGuiaMadre") REFERENCES "GuiaMadre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRuta" ADD CONSTRAINT "DocumentoRuta_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoCosto" ADD CONSTRAINT "DocumentoCosto_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
