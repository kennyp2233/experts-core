/*
  Warnings:

  - You are about to drop the column `id_aerolinea` on the `DocumentoBase` table. All the data in the column will be lost.
  - You are about to drop the column `id_agencia_iata` on the `DocumentoBase` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_stock` on the `DocumentoBase` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_devolucion` on the `GuiaMadre` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_prestamo` on the `GuiaMadre` table. All the data in the column will be lost.
  - You are about to drop the column `id_documento_base` on the `GuiaMadre` table. All the data in the column will be lost.
  - Added the required column `idDocumentoBase` to the `GuiaMadre` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GuiaMadre" DROP CONSTRAINT "GuiaMadre_id_documento_base_fkey";

-- AlterTable
ALTER TABLE "DocumentoBase" DROP COLUMN "id_aerolinea",
DROP COLUMN "id_agencia_iata",
DROP COLUMN "tipo_stock",
ADD COLUMN     "idAerolinea" INTEGER,
ADD COLUMN     "idAgenciaIata" INTEGER,
ADD COLUMN     "tipoStock" "TipoStock";

-- AlterTable
ALTER TABLE "GuiaMadre" DROP COLUMN "fecha_devolucion",
DROP COLUMN "fecha_prestamo",
DROP COLUMN "id_documento_base",
ADD COLUMN     "fechaDevolucion" TIMESTAMP(3),
ADD COLUMN     "fechaPrestamo" TIMESTAMP(3),
ADD COLUMN     "idDocumentoBase" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "GuiaMadre" ADD CONSTRAINT "GuiaMadre_idDocumentoBase_fkey" FOREIGN KEY ("idDocumentoBase") REFERENCES "DocumentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
