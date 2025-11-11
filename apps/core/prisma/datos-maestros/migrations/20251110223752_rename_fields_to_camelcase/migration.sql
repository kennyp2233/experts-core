-- CreateTable
CREATE TABLE "Pais" (
    "idPais" SERIAL NOT NULL,
    "siglasPais" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "paisId" INTEGER,
    "idAcuerdo" INTEGER,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("idPais")
);

-- CreateTable
CREATE TABLE "AcuerdoArancelario" (
    "idAcuerdo" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "AcuerdoArancelario_pkey" PRIMARY KEY ("idAcuerdo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pais_siglasPais_key" ON "Pais"("siglasPais");

-- AddForeignKey
ALTER TABLE "Pais" ADD CONSTRAINT "Pais_idAcuerdo_fkey" FOREIGN KEY ("idAcuerdo") REFERENCES "AcuerdoArancelario"("idAcuerdo") ON DELETE SET NULL ON UPDATE CASCADE;
