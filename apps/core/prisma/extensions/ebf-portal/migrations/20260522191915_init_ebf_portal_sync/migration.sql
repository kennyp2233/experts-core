-- CreateTable
CREATE TABLE "ebf_coordinacion_sync" (
    "id" SERIAL NOT NULL,
    "ebf_detalle_id" INTEGER NOT NULL,
    "ebf_hawb_code" TEXT,
    "ebf_awb_customer_id" INTEGER,
    "awb_number" TEXT NOT NULL,
    "dae_number" TEXT,
    "exportador_ebf" TEXT NOT NULL,
    "consignee_alias" TEXT,
    "producto_ebf" TEXT,
    "producto_ebf_id" INTEGER,
    "fecha_vuelo" TIMESTAMP(3),
    "destino_final" TEXT,
    "ebf_fb_coo" DOUBLE PRECISION,
    "ebf_hb_coo" DOUBLE PRECISION,
    "ebf_qb_coo" DOUBLE PRECISION,
    "ebf_eb_coo" DOUBLE PRECISION,
    "ebf_bxs_coo" DOUBLE PRECISION,
    "ebf_pcs_coo" DOUBLE PRECISION,
    "ebf_bxs_wh" DOUBLE PRECISION,
    "ebf_pcs_wh" DOUBLE PRECISION,
    "match_strategy" TEXT NOT NULL,
    "match_confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "is_owned_by_experts" BOOLEAN NOT NULL DEFAULT false,
    "discrepancies" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "last_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebf_coordinacion_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebf_detalle_access_link" (
    "id" SERIAL NOT NULL,
    "ebf_sync_id" INTEGER NOT NULL,
    "access_bod_codigo" INTEGER NOT NULL,
    "access_doc_tipo" TEXT NOT NULL,
    "access_doc_numero" INTEGER NOT NULL,
    "access_det_numero" INTEGER,
    "access_hawb" BIGINT,
    "access_pla_codigo" INTEGER,
    "access_pro_codigo" TEXT,
    "access_fue" TEXT,
    "match_reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ebf_detalle_access_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebf_catalog_mapping" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "access_id" TEXT,
    "ebf_id" TEXT,
    "name" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebf_catalog_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ebf_coordinacion_sync_ebf_detalle_id_key" ON "ebf_coordinacion_sync"("ebf_detalle_id");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_coordinacion_sync_ebf_hawb_code_key" ON "ebf_coordinacion_sync"("ebf_hawb_code");

-- CreateIndex
CREATE INDEX "ebf_coordinacion_sync_awb_number_idx" ON "ebf_coordinacion_sync"("awb_number");

-- CreateIndex
CREATE INDEX "ebf_coordinacion_sync_dae_number_idx" ON "ebf_coordinacion_sync"("dae_number");

-- CreateIndex
CREATE INDEX "ebf_coordinacion_sync_status_exportador_ebf_idx" ON "ebf_coordinacion_sync"("status", "exportador_ebf");

-- CreateIndex
CREATE INDEX "ebf_coordinacion_sync_last_sync_at_idx" ON "ebf_coordinacion_sync"("last_sync_at");

-- CreateIndex
CREATE INDEX "ebf_detalle_access_link_access_bod_codigo_access_doc_tipo_a_idx" ON "ebf_detalle_access_link"("access_bod_codigo", "access_doc_tipo", "access_doc_numero");

-- CreateIndex
CREATE INDEX "ebf_detalle_access_link_access_fue_idx" ON "ebf_detalle_access_link"("access_fue");

-- CreateIndex
CREATE INDEX "ebf_detalle_access_link_access_hawb_idx" ON "ebf_detalle_access_link"("access_hawb");

-- CreateIndex
CREATE INDEX "ebf_detalle_access_link_ebf_sync_id_idx" ON "ebf_detalle_access_link"("ebf_sync_id");

-- CreateIndex
CREATE INDEX "ebf_catalog_mapping_entity_type_idx" ON "ebf_catalog_mapping"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_catalog_mapping_entity_type_access_id_key" ON "ebf_catalog_mapping"("entity_type", "access_id");

-- CreateIndex
CREATE UNIQUE INDEX "ebf_catalog_mapping_entity_type_ebf_id_key" ON "ebf_catalog_mapping"("entity_type", "ebf_id");

-- AddForeignKey
ALTER TABLE "ebf_detalle_access_link" ADD CONSTRAINT "ebf_detalle_access_link_ebf_sync_id_fkey" FOREIGN KEY ("ebf_sync_id") REFERENCES "ebf_coordinacion_sync"("id") ON DELETE CASCADE ON UPDATE CASCADE;
