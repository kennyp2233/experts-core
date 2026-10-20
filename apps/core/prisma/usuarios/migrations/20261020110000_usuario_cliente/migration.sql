-- Portal de clientes: qué clientes (datos_maestros."Cliente") ve cada usuario de
-- cliente (rol CLIENTE). Tabla nueva; no toca datos existentes.
CREATE TABLE "UsuarioCliente" (
    "userId" TEXT NOT NULL,
    "idCliente" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCliente_pkey" PRIMARY KEY ("userId","idCliente")
);

-- CreateIndex
CREATE INDEX "UsuarioCliente_idCliente_idx" ON "UsuarioCliente"("idCliente");

-- AddForeignKey
ALTER TABLE "UsuarioCliente" ADD CONSTRAINT "UsuarioCliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
