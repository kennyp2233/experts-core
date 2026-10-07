-- CreateTable
CREATE TABLE "fito_producto_mapeo" (
    "id" SERIAL NOT NULL,
    "pro_codigo" VARCHAR(50) NOT NULL,
    "codigo_agrocalidad" VARCHAR(20) NOT NULL,
    "nombre_comun" VARCHAR(200),
    "subtipo" VARCHAR(100),
    "veces_usado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "fito_producto_mapeo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fito_producto_mapeo_pro_codigo_key" ON "fito_producto_mapeo"("pro_codigo");
