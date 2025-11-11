-- CreateTable
CREATE TABLE "Bodeguero" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "claveBodega" TEXT NOT NULL,
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "Bodeguero_pkey" PRIMARY KEY ("id")
);
