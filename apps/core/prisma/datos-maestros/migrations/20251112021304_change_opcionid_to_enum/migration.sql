/*
  Warnings:

  - The `opcionId` column on the `Producto` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OpcionProducto" AS ENUM ('simple', 'compuesto');

-- AlterTable
ALTER TABLE "FuncionarioAgrocalidad" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "opcionId",
ADD COLUMN     "opcionId" "OpcionProducto";
