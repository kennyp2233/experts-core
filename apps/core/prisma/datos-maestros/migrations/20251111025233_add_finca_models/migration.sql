-- CreateTable
CREATE TABLE "FincaChofer" (
    "idFincasChoferes" SERIAL NOT NULL,
    "idFinca" INTEGER NOT NULL,
    "idChofer" INTEGER NOT NULL,

    CONSTRAINT "FincaChofer_pkey" PRIMARY KEY ("idFincasChoferes")
);

-- CreateTable
CREATE TABLE "FincaProducto" (
    "idFincasProductos" SERIAL NOT NULL,
    "idFinca" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,

    CONSTRAINT "FincaProducto_pkey" PRIMARY KEY ("idFincasProductos")
);

-- CreateTable
CREATE TABLE "Finca" (
    "id" SERIAL NOT NULL,
    "nombreFinca" TEXT NOT NULL,
    "tag" TEXT,
    "rucFinca" TEXT,
    "tipoDocumento" TEXT NOT NULL,
    "generaGuiasCertificadas" BOOLEAN DEFAULT false,
    "iGeneralTelefono" TEXT,
    "iGeneralEmail" TEXT,
    "iGeneralCiudad" TEXT,
    "iGeneralProvincia" TEXT,
    "iGeneralPais" TEXT,
    "iGeneralCodSesa" TEXT,
    "iGeneralCodPais" TEXT,
    "aNombre" TEXT,
    "aCodigo" TEXT,
    "aDireccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chofer" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "placasCamion" TEXT,
    "telefono" TEXT,
    "camion" TEXT,
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "Chofer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FincaChofer" ADD CONSTRAINT "FincaChofer_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FincaChofer" ADD CONSTRAINT "FincaChofer_idChofer_fkey" FOREIGN KEY ("idChofer") REFERENCES "Chofer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FincaProducto" ADD CONSTRAINT "FincaProducto_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FincaProducto" ADD CONSTRAINT "FincaProducto_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
