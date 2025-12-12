-- CreateTable
CREATE TABLE "catalogo_productos" (
    "id" SERIAL NOT NULL,
    "nombre_tipo_producto" VARCHAR(100),
    "nombre_subtipo_producto" VARCHAR(100),
    "nombre_comun" VARCHAR(200),
    "codigo_agrocalidad" VARCHAR(20) NOT NULL,
    "clasificacion" VARCHAR(50),
    "nombre_comun_normalizado" VARCHAR(200),
    "activo" BOOLEAN DEFAULT true,
    "fecha_carga" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_puertos" (
    "id" SERIAL NOT NULL,
    "nombre_pais" VARCHAR(100),
    "nombre_pais_ingles" VARCHAR(100),
    "nombre_puerto" VARCHAR(300),
    "codigo_puerto" VARCHAR(20) NOT NULL,
    "tipo_puerto" VARCHAR(20),
    "es_ecuador" BOOLEAN,
    "nombre_puerto_normalizado" VARCHAR(300),
    "activo" BOOLEAN DEFAULT true,
    "fecha_carga" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_puertos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exportadores_cache" (
    "id" SERIAL NOT NULL,
    "nombre_empresa" VARCHAR(300) NOT NULL,
    "ruc" VARCHAR(13) NOT NULL,
    "razon_social" VARCHAR(300),
    "direccion" TEXT,
    "nombre_normalizado" VARCHAR(300),
    "origen" VARCHAR(20) DEFAULT 'legacy_db',
    "activo" BOOLEAN DEFAULT true,
    "ultima_actualizacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exportadores_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fito_uploads" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "fito_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xml_generated" (
    "id" SERIAL NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "xml_content" TEXT NOT NULL,
    "exportador" TEXT NOT NULL,
    "productos" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "xml_generated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fito_jobs" (
    "id" UUID NOT NULL,
    "guia_ids" TEXT NOT NULL,
    "config" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "fito_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fito_xmls" (
    "id" UUID NOT NULL,
    "doc_numero" INTEGER NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "xml_content" TEXT NOT NULL,
    "guia_data" JSONB,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fito_xmls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_productos_codigo_agrocalidad_key" ON "catalogo_productos"("codigo_agrocalidad");

-- CreateIndex
CREATE INDEX "idx_nombre_comun" ON "catalogo_productos"("nombre_comun");

-- CreateIndex
CREATE INDEX "idx_nombre_normalizado" ON "catalogo_productos"("nombre_comun_normalizado");

-- CreateIndex
CREATE INDEX "idx_pais" ON "catalogo_puertos"("nombre_pais");

-- CreateIndex
CREATE INDEX "idx_codigo_puerto" ON "catalogo_puertos"("codigo_puerto");

-- CreateIndex
CREATE INDEX "idx_nombre_puerto" ON "catalogo_puertos"("nombre_puerto_normalizado");

-- CreateIndex
CREATE INDEX "idx_es_ecuador" ON "catalogo_puertos"("es_ecuador");

-- CreateIndex
CREATE UNIQUE INDEX "exportadores_cache_ruc_key" ON "exportadores_cache"("ruc");

-- CreateIndex
CREATE INDEX "idx_nombre" ON "exportadores_cache"("nombre_empresa");

-- CreateIndex
CREATE INDEX "idx_nombre_norm" ON "exportadores_cache"("nombre_normalizado");

-- CreateIndex
CREATE INDEX "idx_fito_xml_doc_numero" ON "fito_xmls"("doc_numero");

-- AddForeignKey
ALTER TABLE "xml_generated" ADD CONSTRAINT "xml_generated_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "fito_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
