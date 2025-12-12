--
-- PostgreSQL database dump
--

\restrict HoXf81WpAOPKmkTmYRia2HgMNeufj4sJY0hLPZPEybXwgM9bHXEvYKO35nNPg2H

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: documentos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA documentos;


--
-- Name: EstadoCoordinacion; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."EstadoCoordinacion" AS ENUM (
    'BORRADOR',
    'CORTADO'
);


--
-- Name: TipoConcepto; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."TipoConcepto" AS ENUM (
    'COSTO_GUIA',
    'COMBUSTIBLE',
    'SEGURIDAD',
    'AUX_CALCULO',
    'IVA',
    'OTROS',
    'AUX1',
    'AUX2'
);


--
-- Name: TipoMultiplicador; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."TipoMultiplicador" AS ENUM (
    'GROSS_WEIGHT',
    'CHARGEABLE_WEIGHT'
);


--
-- Name: TipoPago; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."TipoPago" AS ENUM (
    'PREPAID',
    'COLLECT'
);


--
-- Name: TipoRuta; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."TipoRuta" AS ENUM (
    'ORIGEN',
    'DESTINO1',
    'VIA1',
    'DESTINO2',
    'VIA2',
    'DESTINO3',
    'VIA3'
);


--
-- Name: TipoStock; Type: TYPE; Schema: documentos; Owner: -
--

CREATE TYPE documentos."TipoStock" AS ENUM (
    'NORMAL',
    'VIRTUAL'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: DocumentoBase; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."DocumentoBase" (
    id integer NOT NULL,
    fecha timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "idAerolinea" integer,
    "idAgenciaIata" integer,
    "tipoStock" documentos."TipoStock"
);


--
-- Name: DocumentoBase_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."DocumentoBase_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DocumentoBase_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."DocumentoBase_id_seq" OWNED BY documentos."DocumentoBase".id;


--
-- Name: DocumentoCoordinacion; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."DocumentoCoordinacion" (
    id integer NOT NULL,
    "idGuiaMadre" integer NOT NULL,
    "tarifaRate" double precision DEFAULT 0,
    pca double precision DEFAULT 0,
    "plantillaGuiaMadre" text,
    "plantillaFormatoAerolinea" text,
    "plantillaReservas" text,
    "idProducto" integer NOT NULL,
    "idAgenciaIata" integer NOT NULL,
    "idDestinoAwb" integer NOT NULL,
    "idDestinoFinalDocs" integer NOT NULL,
    "fechaVuelo" timestamp(3) without time zone NOT NULL,
    "fechaAsignacion" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "estadoActual" documentos."EstadoCoordinacion" DEFAULT 'BORRADOR'::documentos."EstadoCoordinacion" NOT NULL,
    pago documentos."TipoPago" DEFAULT 'PREPAID'::documentos."TipoPago" NOT NULL
);


--
-- Name: DocumentoCoordinacion_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."DocumentoCoordinacion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DocumentoCoordinacion_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."DocumentoCoordinacion_id_seq" OWNED BY documentos."DocumentoCoordinacion".id;


--
-- Name: DocumentoCosto; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."DocumentoCosto" (
    id integer NOT NULL,
    "idDocumentoCoordinacion" integer NOT NULL,
    tipo documentos."TipoConcepto" NOT NULL,
    abreviatura text,
    valor double precision DEFAULT 0 NOT NULL,
    multiplicador documentos."TipoMultiplicador"
);


--
-- Name: DocumentoCosto_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."DocumentoCosto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DocumentoCosto_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."DocumentoCosto_id_seq" OWNED BY documentos."DocumentoCosto".id;


--
-- Name: DocumentoRuta; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."DocumentoRuta" (
    id integer NOT NULL,
    "idDocumentoCoordinacion" integer NOT NULL,
    "tipoRuta" documentos."TipoRuta" NOT NULL,
    "origenId" integer,
    "destinoId" integer,
    "viaAerolineaId" integer,
    orden integer
);


--
-- Name: DocumentoRuta_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."DocumentoRuta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DocumentoRuta_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."DocumentoRuta_id_seq" OWNED BY documentos."DocumentoRuta".id;


--
-- Name: GuiaHija; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."GuiaHija" (
    id integer NOT NULL,
    "idDocumentoCoordinacion" integer NOT NULL,
    "idGuiaMadre" integer NOT NULL,
    "idFinca" integer NOT NULL,
    "numeroGuiaHija" text NOT NULL,
    anio integer NOT NULL,
    secuencial integer NOT NULL,
    "pesoBruto" double precision DEFAULT 0 NOT NULL,
    "totalPiezas" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GuiaHijaDetalle; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."GuiaHijaDetalle" (
    id integer NOT NULL,
    "idGuiaHija" integer NOT NULL,
    "idProducto" integer NOT NULL,
    "idTipoCaja" integer NOT NULL,
    "cantidadCajas" integer NOT NULL,
    "ramosPorCaja" integer NOT NULL,
    "tallosPorRamo" integer NOT NULL,
    longitud integer
);


--
-- Name: GuiaHijaDetalle_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."GuiaHijaDetalle_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GuiaHijaDetalle_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."GuiaHijaDetalle_id_seq" OWNED BY documentos."GuiaHijaDetalle".id;


--
-- Name: GuiaHija_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."GuiaHija_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GuiaHija_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."GuiaHija_id_seq" OWNED BY documentos."GuiaHija".id;


--
-- Name: GuiaMadre; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."GuiaMadre" (
    id integer NOT NULL,
    prefijo integer NOT NULL,
    secuencial integer NOT NULL,
    prestada boolean DEFAULT false,
    observaciones text,
    devolucion boolean DEFAULT false,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fechaDevolucion" timestamp(3) without time zone,
    "fechaPrestamo" timestamp(3) without time zone,
    "idDocumentoBase" integer NOT NULL
);


--
-- Name: GuiaMadre_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."GuiaMadre_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GuiaMadre_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."GuiaMadre_id_seq" OWNED BY documentos."GuiaMadre".id;


--
-- Name: TipoCaja; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos."TipoCaja" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "factorFull" double precision NOT NULL
);


--
-- Name: TipoCaja_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos."TipoCaja_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TipoCaja_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos."TipoCaja_id_seq" OWNED BY documentos."TipoCaja".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: DocumentoBase id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoBase" ALTER COLUMN id SET DEFAULT nextval('documentos."DocumentoBase_id_seq"'::regclass);


--
-- Name: DocumentoCoordinacion id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCoordinacion" ALTER COLUMN id SET DEFAULT nextval('documentos."DocumentoCoordinacion_id_seq"'::regclass);


--
-- Name: DocumentoCosto id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCosto" ALTER COLUMN id SET DEFAULT nextval('documentos."DocumentoCosto_id_seq"'::regclass);


--
-- Name: DocumentoRuta id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoRuta" ALTER COLUMN id SET DEFAULT nextval('documentos."DocumentoRuta_id_seq"'::regclass);


--
-- Name: GuiaHija id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHija" ALTER COLUMN id SET DEFAULT nextval('documentos."GuiaHija_id_seq"'::regclass);


--
-- Name: GuiaHijaDetalle id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHijaDetalle" ALTER COLUMN id SET DEFAULT nextval('documentos."GuiaHijaDetalle_id_seq"'::regclass);


--
-- Name: GuiaMadre id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaMadre" ALTER COLUMN id SET DEFAULT nextval('documentos."GuiaMadre_id_seq"'::regclass);


--
-- Name: TipoCaja id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."TipoCaja" ALTER COLUMN id SET DEFAULT nextval('documentos."TipoCaja_id_seq"'::regclass);


--
-- Data for Name: DocumentoBase; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."DocumentoBase" (id, fecha, "createdAt", "updatedAt", "idAerolinea", "idAgenciaIata", "tipoStock") FROM stdin;
\.


--
-- Data for Name: DocumentoCoordinacion; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."DocumentoCoordinacion" (id, "idGuiaMadre", "tarifaRate", pca, "plantillaGuiaMadre", "plantillaFormatoAerolinea", "plantillaReservas", "idProducto", "idAgenciaIata", "idDestinoAwb", "idDestinoFinalDocs", "fechaVuelo", "fechaAsignacion", "createdAt", "updatedAt", "estadoActual", pago) FROM stdin;
\.


--
-- Data for Name: DocumentoCosto; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."DocumentoCosto" (id, "idDocumentoCoordinacion", tipo, abreviatura, valor, multiplicador) FROM stdin;
\.


--
-- Data for Name: DocumentoRuta; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."DocumentoRuta" (id, "idDocumentoCoordinacion", "tipoRuta", "origenId", "destinoId", "viaAerolineaId", orden) FROM stdin;
\.


--
-- Data for Name: GuiaHija; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."GuiaHija" (id, "idDocumentoCoordinacion", "idGuiaMadre", "idFinca", "numeroGuiaHija", anio, secuencial, "pesoBruto", "totalPiezas", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GuiaHijaDetalle; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."GuiaHijaDetalle" (id, "idGuiaHija", "idProducto", "idTipoCaja", "cantidadCajas", "ramosPorCaja", "tallosPorRamo", longitud) FROM stdin;
\.


--
-- Data for Name: GuiaMadre; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."GuiaMadre" (id, prefijo, secuencial, prestada, observaciones, devolucion, "createdAt", "updatedAt", "fechaDevolucion", "fechaPrestamo", "idDocumentoBase") FROM stdin;
\.


--
-- Data for Name: TipoCaja; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos."TipoCaja" (id, nombre, "factorFull") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: documentos; Owner: -
--

COPY documentos._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7c868116-8556-4173-b677-7c4db6aa88ee	b88e1657ae3407fc9e7875d0c1b5cb39415ac411c2b5735953fe124337d42b5c	2025-12-07 04:41:47.416301+00	20251207044147_init_documentos	\N	\N	2025-12-07 04:41:47.405711+00	1
5c05db7f-cf9a-488f-8455-9f2c3bfbb924	f41eebdfb55e7deec2cc026b0f14887330d1a0a17bf663ca4d1f285a4f509172	2025-12-07 04:45:54.380276+00	20251207044554_add_guia_madre	\N	\N	2025-12-07 04:45:54.362037+00	1
8153618d-7209-422b-8e4a-31d1af999b02	ae83e0d9d59bd6fc2790579ced412862febfffd221bd5839b39a5e64ebd2b1a1	2025-12-07 04:46:46.348154+00	20251207044646_rename_to_camel_case	\N	\N	2025-12-07 04:46:46.340242+00	1
b0e08510-897c-4e77-a2f1-6152912bfb1e	8db1e16e6ec43dd8d4472da3b8b195bec96cbc4c4b9cba3b9f6dbfcf631f6111	2025-12-07 04:57:52.588092+00	20251207045752_add_relational_snapshots	\N	\N	2025-12-07 04:57:52.558114+00	1
57caf821-99ee-45c8-9a42-dc7389417732	115c4cbfbd6939175bb2ef30c2444fc17f8a7794c58ad9821b9da2a720bf8698	2025-12-07 05:10:49.45168+00	20251207051049_add_guia_hija	\N	\N	2025-12-07 05:10:49.421029+00	1
ec6363ba-b61e-4a62-b76d-a636f73d6204	4f545f102f495274d0703c593218a444877a4c7d2b334e4b73df6db1fcb5cb19	2025-12-07 05:19:53.570133+00	20251207051953_update_enums_coordinacion	\N	\N	2025-12-07 05:19:53.56052+00	1
\.


--
-- Name: DocumentoBase_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."DocumentoBase_id_seq"', 1, false);


--
-- Name: DocumentoCoordinacion_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."DocumentoCoordinacion_id_seq"', 1, false);


--
-- Name: DocumentoCosto_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."DocumentoCosto_id_seq"', 1, false);


--
-- Name: DocumentoRuta_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."DocumentoRuta_id_seq"', 1, false);


--
-- Name: GuiaHijaDetalle_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."GuiaHijaDetalle_id_seq"', 1, false);


--
-- Name: GuiaHija_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."GuiaHija_id_seq"', 1, false);


--
-- Name: GuiaMadre_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."GuiaMadre_id_seq"', 1, false);


--
-- Name: TipoCaja_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: -
--

SELECT pg_catalog.setval('documentos."TipoCaja_id_seq"', 1, false);


--
-- Name: DocumentoBase DocumentoBase_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoBase"
    ADD CONSTRAINT "DocumentoBase_pkey" PRIMARY KEY (id);


--
-- Name: DocumentoCoordinacion DocumentoCoordinacion_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCoordinacion"
    ADD CONSTRAINT "DocumentoCoordinacion_pkey" PRIMARY KEY (id);


--
-- Name: DocumentoCosto DocumentoCosto_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCosto"
    ADD CONSTRAINT "DocumentoCosto_pkey" PRIMARY KEY (id);


--
-- Name: DocumentoRuta DocumentoRuta_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoRuta"
    ADD CONSTRAINT "DocumentoRuta_pkey" PRIMARY KEY (id);


--
-- Name: GuiaHijaDetalle GuiaHijaDetalle_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHijaDetalle"
    ADD CONSTRAINT "GuiaHijaDetalle_pkey" PRIMARY KEY (id);


--
-- Name: GuiaHija GuiaHija_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHija"
    ADD CONSTRAINT "GuiaHija_pkey" PRIMARY KEY (id);


--
-- Name: GuiaMadre GuiaMadre_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaMadre"
    ADD CONSTRAINT "GuiaMadre_pkey" PRIMARY KEY (id);


--
-- Name: TipoCaja TipoCaja_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."TipoCaja"
    ADD CONSTRAINT "TipoCaja_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: DocumentoCoordinacion_idGuiaMadre_key; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX "DocumentoCoordinacion_idGuiaMadre_key" ON documentos."DocumentoCoordinacion" USING btree ("idGuiaMadre");


--
-- Name: DocumentoCoordinacion DocumentoCoordinacion_idGuiaMadre_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCoordinacion"
    ADD CONSTRAINT "DocumentoCoordinacion_idGuiaMadre_fkey" FOREIGN KEY ("idGuiaMadre") REFERENCES documentos."GuiaMadre"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DocumentoCosto DocumentoCosto_idDocumentoCoordinacion_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoCosto"
    ADD CONSTRAINT "DocumentoCosto_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES documentos."DocumentoCoordinacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentoRuta DocumentoRuta_idDocumentoCoordinacion_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."DocumentoRuta"
    ADD CONSTRAINT "DocumentoRuta_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES documentos."DocumentoCoordinacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuiaHijaDetalle GuiaHijaDetalle_idGuiaHija_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHijaDetalle"
    ADD CONSTRAINT "GuiaHijaDetalle_idGuiaHija_fkey" FOREIGN KEY ("idGuiaHija") REFERENCES documentos."GuiaHija"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GuiaHijaDetalle GuiaHijaDetalle_idTipoCaja_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHijaDetalle"
    ADD CONSTRAINT "GuiaHijaDetalle_idTipoCaja_fkey" FOREIGN KEY ("idTipoCaja") REFERENCES documentos."TipoCaja"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GuiaHija GuiaHija_idDocumentoCoordinacion_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHija"
    ADD CONSTRAINT "GuiaHija_idDocumentoCoordinacion_fkey" FOREIGN KEY ("idDocumentoCoordinacion") REFERENCES documentos."DocumentoCoordinacion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GuiaHija GuiaHija_idGuiaMadre_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaHija"
    ADD CONSTRAINT "GuiaHija_idGuiaMadre_fkey" FOREIGN KEY ("idGuiaMadre") REFERENCES documentos."GuiaMadre"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GuiaMadre GuiaMadre_idDocumentoBase_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos."GuiaMadre"
    ADD CONSTRAINT "GuiaMadre_idDocumentoBase_fkey" FOREIGN KEY ("idDocumentoBase") REFERENCES documentos."DocumentoBase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict HoXf81WpAOPKmkTmYRia2HgMNeufj4sJY0hLPZPEybXwgM9bHXEvYKO35nNPg2H

