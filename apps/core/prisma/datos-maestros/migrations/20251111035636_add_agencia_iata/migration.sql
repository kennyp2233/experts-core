-- CreateTable
CREATE TABLE "AgenciaIata" (
    "id" SERIAL NOT NULL,
    "nombreShipper" TEXT NOT NULL,
    "rucShipper" TEXT,
    "direccionShipper" TEXT,
    "telefonoShipper" TEXT,
    "ciudadShipper" TEXT,
    "paisShipper" TEXT,
    "nombreCarrier" TEXT,
    "rucCarrier" TEXT,
    "direccionCarrier" TEXT,
    "telefonoCarrier" TEXT,
    "ciudadCarrier" TEXT,
    "paisCarrier" TEXT,
    "iataCodeCarrier" TEXT,
    "registroExportador" TEXT,
    "codigoOperador" TEXT,
    "codigoConsolidador" TEXT,
    "comision" DOUBLE PRECISION,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AgenciaIata_pkey" PRIMARY KEY ("id")
);
