/*
  Warnings:

  - You are about to drop the column `by1` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `by2` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `by3` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `estadoActivo` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `from1` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `to1` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `to2` on the `Aerolinea` table. All the data in the column will be lost.
  - You are about to drop the column `to3` on the `Aerolinea` table. All the data in the column will be lost.
  - The `modo` column on the `Aerolinea` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `aux1Abrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `aux1Valor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `aux2Abrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `aux2Valor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `auxCalcMult` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `auxCalculoAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `auxCalculoValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `combustibleAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `combustibleMult` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `combustibleValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `costoGuiaAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `costoGuiaValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `ivaAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `ivaValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `otrosAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `otrosValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `seguridadAbrv` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `seguridadMult` on the `AerolineasPlantilla` table. All the data in the column will be lost.
  - You are about to drop the column `seguridadValor` on the `AerolineasPlantilla` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoRuta" AS ENUM ('ORIGEN', 'DESTINO1', 'VIA1', 'DESTINO2', 'VIA2', 'DESTINO3', 'VIA3');

-- CreateEnum
CREATE TYPE "ModoAerolinea" AS ENUM ('EN_PIEZAS', 'EN_FULLES');

-- CreateEnum
CREATE TYPE "TipoConcepto" AS ENUM ('COSTO_GUIA', 'COMBUSTIBLE', 'SEGURIDAD', 'AUX_CALCULO', 'IVA', 'OTROS', 'AUX1', 'AUX2');

-- CreateEnum
CREATE TYPE "TipoMultiplicador" AS ENUM ('GROSS_WEIGHT', 'CHARGEABLE_WEIGHT');

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_by1_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_by2_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_by3_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_from1_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_to1_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_to2_fkey";

-- DropForeignKey
ALTER TABLE "Aerolinea" DROP CONSTRAINT "Aerolinea_to3_fkey";

-- AlterTable
ALTER TABLE "Aerolinea" DROP COLUMN "by1",
DROP COLUMN "by2",
DROP COLUMN "by3",
DROP COLUMN "estadoActivo",
DROP COLUMN "from1",
DROP COLUMN "to1",
DROP COLUMN "to2",
DROP COLUMN "to3",
ADD COLUMN     "estado" BOOLEAN DEFAULT true,
DROP COLUMN "modo",
ADD COLUMN     "modo" "ModoAerolinea" DEFAULT 'EN_PIEZAS';

-- AlterTable
ALTER TABLE "AerolineasPlantilla" DROP COLUMN "aux1Abrv",
DROP COLUMN "aux1Valor",
DROP COLUMN "aux2Abrv",
DROP COLUMN "aux2Valor",
DROP COLUMN "auxCalcMult",
DROP COLUMN "auxCalculoAbrv",
DROP COLUMN "auxCalculoValor",
DROP COLUMN "combustibleAbrv",
DROP COLUMN "combustibleMult",
DROP COLUMN "combustibleValor",
DROP COLUMN "costoGuiaAbrv",
DROP COLUMN "costoGuiaValor",
DROP COLUMN "ivaAbrv",
DROP COLUMN "ivaValor",
DROP COLUMN "otrosAbrv",
DROP COLUMN "otrosValor",
DROP COLUMN "seguridadAbrv",
DROP COLUMN "seguridadMult",
DROP COLUMN "seguridadValor";

-- CreateTable
CREATE TABLE "AerolineaRuta" (
    "id" SERIAL NOT NULL,
    "aerolineaId" INTEGER NOT NULL,
    "tipoRuta" "TipoRuta" NOT NULL,
    "origenId" INTEGER,
    "destinoId" INTEGER,
    "viaAerolineaId" INTEGER,
    "orden" INTEGER,

    CONSTRAINT "AerolineaRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoCosto" (
    "id" SERIAL NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "tipo" "TipoConcepto" NOT NULL,
    "abreviatura" TEXT,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplicador" "TipoMultiplicador",

    CONSTRAINT "ConceptoCosto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AerolineaRuta" ADD CONSTRAINT "AerolineaRuta_aerolineaId_fkey" FOREIGN KEY ("aerolineaId") REFERENCES "Aerolinea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AerolineaRuta" ADD CONSTRAINT "AerolineaRuta_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Origen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AerolineaRuta" ADD CONSTRAINT "AerolineaRuta_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AerolineaRuta" ADD CONSTRAINT "AerolineaRuta_viaAerolineaId_fkey" FOREIGN KEY ("viaAerolineaId") REFERENCES "Aerolinea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoCosto" ADD CONSTRAINT "ConceptoCosto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "AerolineasPlantilla"("idAerolinea") ON DELETE CASCADE ON UPDATE CASCADE;
