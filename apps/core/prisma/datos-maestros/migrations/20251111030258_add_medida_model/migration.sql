/*
  Warnings:

  - Made the column `medidaId` on table `Producto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "medidaId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Medida" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Medida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Medida_nombre_key" ON "Medida"("nombre");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_medidaId_fkey" FOREIGN KEY ("medidaId") REFERENCES "Medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
