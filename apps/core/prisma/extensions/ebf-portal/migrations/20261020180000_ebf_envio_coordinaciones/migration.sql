-- CreateTable
CREATE TABLE "ebf_equivalencia" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "id_local" INTEGER NOT NULL,
    "ebf_id" INTEGER,
    "ebf_nombre" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "veces_vista" INTEGER NOT NULL DEFAULT 0,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "confirmada_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebf_equivalencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebf_coordinacion" (
    "id" SERIAL NOT NULL,
    "id_coordinacion" INTEGER NOT NULL,
    "numero" INTEGER,
    "numero_guia" TEXT,
    "fecha_vuelo" DATE NOT NULL,
    "id_consignatario" INTEGER,
    "enviable" BOOLEAN NOT NULL DEFAULT false,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "ebf_vuelo_id" INTEGER,
    "ebf_vuelo" TEXT,
    "ebf_guia" TEXT,
    "ebf_estado" TEXT,
    "ebf_fulls" DOUBLE PRECISION,
    "ebf_cajas" INTEGER,
    "ebf_fulls_bodega" DOUBLE PRECISION,
    "ebf_cajas_bodega" INTEGER,
    "ebf_peso_bruto" DOUBLE PRECISION,
    "ebf_peso_cobrable" DOUBLE PRECISION,
    "ebf_filas" JSONB,
    "avisos" JSONB,
    "leido_en" TIMESTAMP(3),
    "error_lectura" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebf_coordinacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebf_linea" (
    "id" SERIAL NOT NULL,
    "id_ebf_coordinacion" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "id_finca" INTEGER NOT NULL,
    "id_producto" INTEGER,
    "id_consignatario" INTEGER NOT NULL,
    "numero_guia_hija" TEXT,
    "dae" TEXT,
    "fulls" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cajas" INTEGER NOT NULL DEFAULT 0,
    "cajas_por_tipo" JSONB,
    "ebf_detalle_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "ebf_hawb" TEXT,
    "ebf_exportador" TEXT,
    "ebf_producto" TEXT,
    "ebf_dae" TEXT,
    "ebf_fulls" DOUBLE PRECISION,
    "ebf_cajas" INTEGER,
    "ebf_fulls_bodega" DOUBLE PRECISION,
    "ebf_cajas_bodega" INTEGER,
    "ebf_creado_en" TIMESTAMP(3),
    "ebf_creado_por" TEXT,
    "estado" TEXT NOT NULL,
    "accion" TEXT,
    "accion_detalle" JSONB,
    "motivo" TEXT,
    "omitida_huella" TEXT,
    "ultimo_error" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "enviada_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebf_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebf_bitacora" (
    "id" SERIAL NOT NULL,
    "id_coordinacion" INTEGER NOT NULL,
    "clave" TEXT,
    "accion" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "detalle" JSONB,
    "usuario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ebf_bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ebf_equivalencia_tipo_ebf_nombre_idx" ON "ebf_equivalencia"("tipo", "ebf_nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_equivalencia_tipo_id_local_key" ON "ebf_equivalencia"("tipo", "id_local");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_coordinacion_id_coordinacion_key" ON "ebf_coordinacion"("id_coordinacion");

-- CreateIndex
CREATE INDEX "ebf_coordinacion_fecha_vuelo_idx" ON "ebf_coordinacion"("fecha_vuelo");

-- CreateIndex
CREATE INDEX "ebf_linea_estado_idx" ON "ebf_linea"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_linea_id_ebf_coordinacion_clave_key" ON "ebf_linea"("id_ebf_coordinacion", "clave");

-- CreateIndex
CREATE INDEX "ebf_bitacora_id_coordinacion_idx" ON "ebf_bitacora"("id_coordinacion");

-- CreateIndex
CREATE INDEX "ebf_bitacora_created_at_idx" ON "ebf_bitacora"("created_at");

-- AddForeignKey
ALTER TABLE "ebf_linea" ADD CONSTRAINT "ebf_linea_id_ebf_coordinacion_fkey" FOREIGN KEY ("id_ebf_coordinacion") REFERENCES "ebf_coordinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

