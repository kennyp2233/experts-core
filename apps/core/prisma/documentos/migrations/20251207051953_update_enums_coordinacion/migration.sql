/*
  Warnings:

  - You are about to drop the column `idEstadoActual` on the `DocumentoCoordinacion` table. All the data in the column will be lost.
  - The `pago` column on the `DocumentoCoordinacion` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoCoordinacion" AS ENUM ('BORRADOR', 'CORTADO');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('PREPAID', 'COLLECT');

-- AlterTable
ALTER TABLE "DocumentoCoordinacion" DROP COLUMN "idEstadoActual",
ADD COLUMN     "estadoActual" "EstadoCoordinacion" NOT NULL DEFAULT 'BORRADOR',
DROP COLUMN "pago",
ADD COLUMN     "pago" "TipoPago" NOT NULL DEFAULT 'PREPAID';
