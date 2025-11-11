-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "nombreBotanico" TEXT,
    "especie" TEXT,
    "medidaId" INTEGER,
    "precioUnitario" DECIMAL(65,30),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "opcionId" INTEGER,
    "stemsPorFull" INTEGER,
    "sesaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductosAranceles" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "arancelesDestino" TEXT,
    "arancelesCodigo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductosAranceles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductosCompuesto" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "destino" TEXT,
    "declaracion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductosCompuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductosMiPro" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "acuerdo" TEXT,
    "djoCode" TEXT,
    "tariffCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductosMiPro_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductosAranceles" ADD CONSTRAINT "ProductosAranceles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductosCompuesto" ADD CONSTRAINT "ProductosCompuesto_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductosMiPro" ADD CONSTRAINT "ProductosMiPro_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
