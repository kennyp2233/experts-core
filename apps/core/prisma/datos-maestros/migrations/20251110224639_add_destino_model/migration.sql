-- CreateTable
CREATE TABLE "Destino" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT,
    "aeropuerto" TEXT,
    "idPais" INTEGER NOT NULL,
    "sesaId" TEXT,
    "leyendaFito" TEXT,
    "cobroFitos" BOOLEAN DEFAULT false,

    CONSTRAINT "Destino_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Destino" ADD CONSTRAINT "Destino_idPais_fkey" FOREIGN KEY ("idPais") REFERENCES "Pais"("idPais") ON DELETE RESTRICT ON UPDATE CASCADE;
