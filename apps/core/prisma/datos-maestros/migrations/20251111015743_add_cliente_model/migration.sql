-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "clienteCodigoPais" TEXT,
    "fitosValor" DOUBLE PRECISION,
    "formA" INTEGER,
    "transport" INTEGER,
    "termo" INTEGER,
    "mica" INTEGER,
    "handling" DOUBLE PRECISION,
    "cuentaContable" TEXT,
    "nombreFactura" TEXT,
    "rucFactura" TEXT,
    "direccionFactura" TEXT,
    "telefonoFactura" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);
