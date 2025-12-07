-- CreateTable
CREATE TABLE "GuiaMadre" (
    "id" SERIAL NOT NULL,
    "prefijo" INTEGER NOT NULL,
    "secuencial" INTEGER NOT NULL,
    "id_documento_base" INTEGER NOT NULL,
    "prestada" BOOLEAN DEFAULT false,
    "observaciones" TEXT,
    "fecha_prestamo" TIMESTAMP(3),
    "devolucion" BOOLEAN DEFAULT false,
    "fecha_devolucion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuiaMadre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuiaMadre" ADD CONSTRAINT "GuiaMadre_id_documento_base_fkey" FOREIGN KEY ("id_documento_base") REFERENCES "DocumentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
