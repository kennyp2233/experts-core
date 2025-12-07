-- CreateEnum
CREATE TYPE "TipoStock" AS ENUM ('NORMAL', 'VIRTUAL');

-- CreateTable
CREATE TABLE "DocumentoBase" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3),
    "id_aerolinea" INTEGER,
    "id_agencia_iata" INTEGER,
    "tipo_stock" "TipoStock",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoBase_pkey" PRIMARY KEY ("id")
);
