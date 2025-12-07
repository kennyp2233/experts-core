-- CreateTable
CREATE TABLE "TipoCaja" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "factorFull" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TipoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuiaHija" (
    "id" SERIAL NOT NULL,
    "idDocumentoCoordinacion" INTEGER NOT NULL,
    "idGuiaMadre" INTEGER NOT NULL,
    "idFinca" INTEGER NOT NULL,
    "numeroGuiaHija" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "secuencial" INTEGER NOT NULL,
    "pesoBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPiezas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuiaHija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuiaHijaDetalle" (
    "id" SERIAL NOT NULL,
    "idGuiaHija" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "idTipoCaja" INTEGER NOT NULL,
    "cantidadCajas" INTEGER NOT NULL,
    "ramosPorCaja" INTEGER NOT NULL,
    "tallosPorRamo" INTEGER NOT NULL,
    "longitud" INTEGER,

    CONSTRAINT "GuiaHijaDetalle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuiaHija" ADD CONSTRAINT "GuiaHija_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES "DocumentoCoordinacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHija" ADD CONSTRAINT "GuiaHija_idGuiaMadre_fkey" FOREIGN KEY ("idGuiaMadre") REFERENCES "GuiaMadre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHijaDetalle" ADD CONSTRAINT "GuiaHijaDetalle_idGuiaHija_fkey" FOREIGN KEY ("idGuiaHija") REFERENCES "GuiaHija"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaHijaDetalle" ADD CONSTRAINT "GuiaHijaDetalle_idTipoCaja_fkey" FOREIGN KEY ("idTipoCaja") REFERENCES "TipoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
