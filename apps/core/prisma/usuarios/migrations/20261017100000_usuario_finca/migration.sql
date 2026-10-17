-- Portal de fincas: qué fincas puede cargar cada usuario de finca (rol FINCA),
-- como WEB_sisFincas del sistema viejo. Tabla nueva; no toca datos existentes.
CREATE TABLE "UsuarioFinca" (
    "userId" TEXT NOT NULL,
    "idFinca" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioFinca_pkey" PRIMARY KEY ("userId","idFinca")
);

-- CreateIndex
CREATE INDEX "UsuarioFinca_idFinca_idx" ON "UsuarioFinca"("idFinca");

-- AddForeignKey
ALTER TABLE "UsuarioFinca" ADD CONSTRAINT "UsuarioFinca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
