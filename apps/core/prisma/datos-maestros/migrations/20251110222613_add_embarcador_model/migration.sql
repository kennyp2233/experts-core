-- CreateTable
CREATE TABLE "Embarcador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ci" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "pais" TEXT,
    "embarcadorCodigoPais" TEXT,
    "handling" DOUBLE PRECISION,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Embarcador_pkey" PRIMARY KEY ("id")
);
