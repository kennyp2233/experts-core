-- CreateTable
CREATE TABLE "Origen" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT,
    "aeropuerto" TEXT,
    "idPais" INTEGER,
    "idCaeAduana" INTEGER,

    CONSTRAINT "Origen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaeAduana" (
    "idCaeAduana" SERIAL NOT NULL,
    "codigoAduana" INTEGER,
    "nombre" TEXT,

    CONSTRAINT "CaeAduana_pkey" PRIMARY KEY ("idCaeAduana")
);

-- AddForeignKey
ALTER TABLE "Origen" ADD CONSTRAINT "Origen_idPais_fkey" FOREIGN KEY ("idPais") REFERENCES "Pais"("idPais") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Origen" ADD CONSTRAINT "Origen_idCaeAduana_fkey" FOREIGN KEY ("idCaeAduana") REFERENCES "CaeAduana"("idCaeAduana") ON DELETE SET NULL ON UPDATE CASCADE;
