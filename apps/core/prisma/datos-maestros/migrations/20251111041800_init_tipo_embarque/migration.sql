-- CreateTable
CREATE TABLE "TipoEmbarque" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "idTipoCarga" INTEGER,
    "idTipoEmbalaje" INTEGER,
    "regimen" TEXT,
    "mercancia" TEXT,
    "harmonisedCommodity" TEXT,

    CONSTRAINT "TipoEmbarque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCarga" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEmbalaje" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoEmbalaje_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TipoEmbarque" ADD CONSTRAINT "TipoEmbarque_idTipoCarga_fkey" FOREIGN KEY ("idTipoCarga") REFERENCES "TipoCarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoEmbarque" ADD CONSTRAINT "TipoEmbarque_idTipoEmbalaje_fkey" FOREIGN KEY ("idTipoEmbalaje") REFERENCES "TipoEmbalaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;
