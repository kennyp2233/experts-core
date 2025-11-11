-- CreateTable
CREATE TABLE "Aerolinea" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciRuc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "contacto" TEXT,
    "modo" TEXT DEFAULT '',
    "maestraGuiasHijas" BOOLEAN DEFAULT false,
    "codigo" TEXT,
    "prefijoAwb" TEXT,
    "codigoCae" TEXT,
    "estadoActivo" BOOLEAN DEFAULT true,
    "from1" INTEGER,
    "to1" INTEGER,
    "by1" INTEGER,
    "to2" INTEGER,
    "by2" INTEGER,
    "to3" INTEGER,
    "by3" INTEGER,
    "afiliadoCass" BOOLEAN DEFAULT false,
    "guiasVirtuales" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aerolinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AerolineasPlantilla" (
    "idAerolinea" INTEGER NOT NULL,
    "costoGuiaAbrv" TEXT,
    "combustibleAbrv" TEXT,
    "seguridadAbrv" TEXT,
    "auxCalculoAbrv" TEXT,
    "ivaAbrv" TEXT,
    "otrosAbrv" TEXT,
    "aux1Abrv" TEXT,
    "aux2Abrv" TEXT,
    "costoGuiaValor" DOUBLE PRECISION DEFAULT 0,
    "combustibleValor" DOUBLE PRECISION DEFAULT 0,
    "seguridadValor" DOUBLE PRECISION DEFAULT 0,
    "auxCalculoValor" DOUBLE PRECISION DEFAULT 0,
    "otrosValor" DOUBLE PRECISION DEFAULT 0,
    "aux1Valor" DOUBLE PRECISION DEFAULT 0,
    "aux2Valor" DOUBLE PRECISION DEFAULT 0,
    "plantillaGuiaMadre" TEXT,
    "plantillaFormatoAerolinea" TEXT,
    "plantillaReservas" TEXT,
    "tarifaRate" DOUBLE PRECISION DEFAULT 0,
    "pca" DOUBLE PRECISION DEFAULT 0,
    "combustibleMult" TEXT,
    "seguridadMult" TEXT,
    "auxCalcMult" TEXT,
    "ivaValor" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "AerolineasPlantilla_pkey" PRIMARY KEY ("idAerolinea")
);

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_from1_fkey" FOREIGN KEY ("from1") REFERENCES "Origen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_to1_fkey" FOREIGN KEY ("to1") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_by1_fkey" FOREIGN KEY ("by1") REFERENCES "Aerolinea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_to2_fkey" FOREIGN KEY ("to2") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_by2_fkey" FOREIGN KEY ("by2") REFERENCES "Aerolinea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_to3_fkey" FOREIGN KEY ("to3") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aerolinea" ADD CONSTRAINT "Aerolinea_by3_fkey" FOREIGN KEY ("by3") REFERENCES "Aerolinea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AerolineasPlantilla" ADD CONSTRAINT "AerolineasPlantilla_idAerolinea_fkey" FOREIGN KEY ("idAerolinea") REFERENCES "Aerolinea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
