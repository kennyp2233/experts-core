-- Contadores del sistema nuevo (numeración de guías hijas, …).
-- CreateTable
CREATE TABLE "Contador" (
    "clave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contador_pkey" PRIMARY KEY ("clave")
);

