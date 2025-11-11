-- CreateTable
CREATE TABLE "SubAgencia" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciRuc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "provincia" TEXT,
    "representante" TEXT,
    "comision" DOUBLE PRECISION,
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "SubAgencia_pkey" PRIMARY KEY ("id")
);
