--
-- PostgreSQL database dump
--

\restrict UA8efZyp5yuxBO2fFb3FA8Az56MbNMp8wRXkqGrMgFiVnn4EL3pXr5uLv5PQcCS

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
-- Name: datos_maestros; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA datos_maestros;


--
-- Name: ModoAerolinea; Type: TYPE; Schema: datos_maestros; Owner: -
--

CREATE TYPE datos_maestros."ModoAerolinea" AS ENUM (
    'EN_PIEZAS',
    'EN_FULLES'
);


--
-- Name: OpcionProducto; Type: TYPE; Schema: datos_maestros; Owner: -
--

CREATE TYPE datos_maestros."OpcionProducto" AS ENUM (
    'simple',
    'compuesto'
);


--
-- Name: TipoConcepto; Type: TYPE; Schema: datos_maestros; Owner: -
--

CREATE TYPE datos_maestros."TipoConcepto" AS ENUM (
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
-- Name: TipoMultiplicador; Type: TYPE; Schema: datos_maestros; Owner: -
--

CREATE TYPE datos_maestros."TipoMultiplicador" AS ENUM (
    'GROSS_WEIGHT',
    'CHARGEABLE_WEIGHT'
);


--
-- Name: TipoRuta; Type: TYPE; Schema: datos_maestros; Owner: -
--

CREATE TYPE datos_maestros."TipoRuta" AS ENUM (
    'ORIGEN',
    'DESTINO1',
    'VIA1',
    'DESTINO2',
    'VIA2',
    'DESTINO3',
    'VIA3'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AcuerdoArancelario; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."AcuerdoArancelario" (
    "idAcuerdo" integer NOT NULL,
    nombre text NOT NULL
);


--
-- Name: AcuerdoArancelario_idAcuerdo_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."AcuerdoArancelario_idAcuerdo_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AcuerdoArancelario_idAcuerdo_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."AcuerdoArancelario_idAcuerdo_seq" OWNED BY datos_maestros."AcuerdoArancelario"."idAcuerdo";


--
-- Name: Aerolinea; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Aerolinea" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "ciRuc" text,
    direccion text,
    telefono text,
    email text,
    ciudad text,
    pais text,
    contacto text,
    "maestraGuiasHijas" boolean DEFAULT false,
    codigo text,
    "prefijoAwb" text,
    "codigoCae" text,
    "afiliadoCass" boolean DEFAULT false,
    "guiasVirtuales" boolean DEFAULT true,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    estado boolean DEFAULT true,
    modo datos_maestros."ModoAerolinea" DEFAULT 'EN_PIEZAS'::datos_maestros."ModoAerolinea"
);


--
-- Name: AerolineaRuta; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."AerolineaRuta" (
    id integer NOT NULL,
    "aerolineaId" integer NOT NULL,
    "tipoRuta" datos_maestros."TipoRuta" NOT NULL,
    "origenId" integer,
    "destinoId" integer,
    "viaAerolineaId" integer,
    orden integer
);


--
-- Name: AerolineaRuta_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."AerolineaRuta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AerolineaRuta_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."AerolineaRuta_id_seq" OWNED BY datos_maestros."AerolineaRuta".id;


--
-- Name: Aerolinea_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Aerolinea_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Aerolinea_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Aerolinea_id_seq" OWNED BY datos_maestros."Aerolinea".id;


--
-- Name: AerolineasPlantilla; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."AerolineasPlantilla" (
    "idAerolinea" integer NOT NULL,
    "plantillaGuiaMadre" text,
    "plantillaFormatoAerolinea" text,
    "plantillaReservas" text,
    "tarifaRate" double precision DEFAULT 0,
    pca double precision DEFAULT 0
);


--
-- Name: AgenciaIata; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."AgenciaIata" (
    id integer NOT NULL,
    "nombreShipper" text NOT NULL,
    "rucShipper" text,
    "direccionShipper" text,
    "telefonoShipper" text,
    "ciudadShipper" text,
    "paisShipper" text,
    "nombreCarrier" text,
    "rucCarrier" text,
    "direccionCarrier" text,
    "telefonoCarrier" text,
    "ciudadCarrier" text,
    "paisCarrier" text,
    "iataCodeCarrier" text,
    "registroExportador" text,
    "codigoOperador" text,
    "codigoConsolidador" text,
    comision double precision,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: AgenciaIata_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."AgenciaIata_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AgenciaIata_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."AgenciaIata_id_seq" OWNED BY datos_maestros."AgenciaIata".id;


--
-- Name: Bodeguero; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Bodeguero" (
    id integer NOT NULL,
    nombre text NOT NULL,
    ci text NOT NULL,
    "claveBodega" text NOT NULL,
    estado boolean DEFAULT true
);


--
-- Name: Bodeguero_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Bodeguero_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Bodeguero_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Bodeguero_id_seq" OWNED BY datos_maestros."Bodeguero".id;


--
-- Name: CaeAduana; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."CaeAduana" (
    "idCaeAduana" integer NOT NULL,
    "codigoAduana" integer,
    nombre text NOT NULL
);


--
-- Name: CaeAduana_idCaeAduana_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."CaeAduana_idCaeAduana_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CaeAduana_idCaeAduana_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."CaeAduana_idCaeAduana_seq" OWNED BY datos_maestros."CaeAduana"."idCaeAduana";


--
-- Name: Chofer; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Chofer" (
    id integer NOT NULL,
    nombre text NOT NULL,
    ruc text NOT NULL,
    "placasCamion" text,
    telefono text,
    camion text,
    estado boolean DEFAULT true
);


--
-- Name: Chofer_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Chofer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Chofer_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Chofer_id_seq" OWNED BY datos_maestros."Chofer".id;


--
-- Name: Cliente; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Cliente" (
    id integer NOT NULL,
    nombre text NOT NULL,
    ruc text,
    direccion text,
    telefono text,
    email text,
    ciudad text,
    pais text,
    "clienteCodigoPais" text,
    "fitosValor" double precision,
    "formA" integer,
    transport integer,
    termo integer,
    mica integer,
    handling double precision,
    "cuentaContable" text,
    "nombreFactura" text,
    "rucFactura" text,
    "direccionFactura" text,
    "telefonoFactura" text,
    estado boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Cliente_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Cliente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Cliente_id_seq" OWNED BY datos_maestros."Cliente".id;


--
-- Name: ConceptoCosto; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConceptoCosto" (
    id integer NOT NULL,
    "plantillaId" integer NOT NULL,
    tipo datos_maestros."TipoConcepto" NOT NULL,
    abreviatura text,
    valor double precision DEFAULT 0 NOT NULL,
    multiplicador datos_maestros."TipoMultiplicador"
);


--
-- Name: ConceptoCosto_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."ConceptoCosto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ConceptoCosto_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."ConceptoCosto_id_seq" OWNED BY datos_maestros."ConceptoCosto".id;


--
-- Name: Consignatario; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Consignatario" (
    id integer NOT NULL,
    nombre text NOT NULL,
    ruc text,
    direccion text,
    "idEmbarcador" integer NOT NULL,
    "idCliente" integer NOT NULL,
    telefono text,
    email text,
    ciudad text,
    pais text,
    estado boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ConsignatarioCaeSice; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioCaeSice" (
    "idConsignatario" integer NOT NULL,
    "consigneeNombre" text,
    "consigneeDireccion" text,
    "consigneeDocumento" text,
    "consigneeSiglasPais" text,
    "notifyNombre" text,
    "notifyDireccion" text,
    "notifyDocumento" text,
    "notifySiglasPais" text,
    "hawbNombre" text,
    "hawbDireccion" text,
    "hawbDocumento" text,
    "hawbSiglasPais" text,
    "consigneeTipoDocumento" text,
    "notifyTipoDocumento" text,
    "hawbTipoDocumento" text
);


--
-- Name: ConsignatarioFacturacion; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioFacturacion" (
    "idConsignatario" integer NOT NULL,
    "facturaNombre" text,
    "facturaRuc" text,
    "facturaDireccion" text,
    "facturaTelefono" text
);


--
-- Name: ConsignatarioFito; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioFito" (
    "idConsignatario" integer NOT NULL,
    "fitoDeclaredName" text,
    "fitoFormaA" text,
    "fitoNombre" text,
    "fitoDireccion" text,
    "fitoPais" text
);


--
-- Name: ConsignatarioGuiaH; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioGuiaH" (
    "idConsignatario" integer NOT NULL,
    "guiaHConsignee" text,
    "guiaHNameAdress" text,
    "guiaHNotify" text
);


--
-- Name: ConsignatarioGuiaM; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioGuiaM" (
    "idConsignatario" integer NOT NULL,
    "idDestino" integer,
    "guiaMConsignee" text,
    "guiaMNameAddress" text,
    "guiaMNotify" text
);


--
-- Name: ConsignatarioTransmision; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ConsignatarioTransmision" (
    "idConsignatario" integer NOT NULL,
    "consigneeNombreTrans" text,
    "consigneeDireccionTrans" text,
    "consigneeCiudadTrans" text,
    "consigneeProvinciaTrans" text,
    "consigneePaisTrans" text,
    "consigneeEueoriTrans" text,
    "notifyNombreTrans" text,
    "notifyDireccionTrans" text,
    "notifyCiudadTrans" text,
    "notifyProvinciaTrans" text,
    "notifyPaisTrans" text,
    "notifyEueoriTrans" text,
    "hawbNombreTrans" text,
    "hawbDireccionTrans" text,
    "hawbCiudadTrans" text,
    "hawbProvinciaTrans" text,
    "hawbPaisTrans" text,
    "hawbEueoriTrans" text
);


--
-- Name: Consignatario_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Consignatario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Consignatario_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Consignatario_id_seq" OWNED BY datos_maestros."Consignatario".id;


--
-- Name: Destino; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Destino" (
    id integer NOT NULL,
    nombre text,
    aeropuerto text,
    "idPais" integer NOT NULL,
    "sesaId" text,
    "leyendaFito" text,
    "cobroFitos" boolean DEFAULT false
);


--
-- Name: Destino_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Destino_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Destino_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Destino_id_seq" OWNED BY datos_maestros."Destino".id;


--
-- Name: Embarcador; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Embarcador" (
    id integer NOT NULL,
    nombre text NOT NULL,
    ci text,
    direccion text,
    telefono text,
    email text,
    ciudad text,
    provincia text,
    pais text,
    "embarcadorCodigoPais" text,
    handling double precision,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: Embarcador_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Embarcador_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Embarcador_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Embarcador_id_seq" OWNED BY datos_maestros."Embarcador".id;


--
-- Name: Finca; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Finca" (
    id integer NOT NULL,
    "nombreFinca" text NOT NULL,
    tag text,
    "rucFinca" text,
    "tipoDocumento" text NOT NULL,
    "generaGuiasCertificadas" boolean DEFAULT false,
    "iGeneralTelefono" text,
    "iGeneralEmail" text,
    "iGeneralCiudad" text,
    "iGeneralProvincia" text,
    "iGeneralPais" text,
    "iGeneralCodSesa" text,
    "iGeneralCodPais" text,
    "aNombre" text,
    "aCodigo" text,
    "aDireccion" text,
    estado boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FincaChofer; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."FincaChofer" (
    "idFincasChoferes" integer NOT NULL,
    "idFinca" integer NOT NULL,
    "idChofer" integer NOT NULL
);


--
-- Name: FincaChofer_idFincasChoferes_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."FincaChofer_idFincasChoferes_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FincaChofer_idFincasChoferes_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."FincaChofer_idFincasChoferes_seq" OWNED BY datos_maestros."FincaChofer"."idFincasChoferes";


--
-- Name: FincaProducto; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."FincaProducto" (
    "idFincasProductos" integer NOT NULL,
    "idFinca" integer NOT NULL,
    "idProducto" integer NOT NULL
);


--
-- Name: FincaProducto_idFincasProductos_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."FincaProducto_idFincasProductos_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FincaProducto_idFincasProductos_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."FincaProducto_idFincasProductos_seq" OWNED BY datos_maestros."FincaProducto"."idFincasProductos";


--
-- Name: Finca_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Finca_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Finca_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Finca_id_seq" OWNED BY datos_maestros."Finca".id;


--
-- Name: FuncionarioAgrocalidad; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."FuncionarioAgrocalidad" (
    id integer NOT NULL,
    nombre text NOT NULL,
    telefono text,
    email text,
    estado boolean DEFAULT true,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FuncionarioAgrocalidad_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."FuncionarioAgrocalidad_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FuncionarioAgrocalidad_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."FuncionarioAgrocalidad_id_seq" OWNED BY datos_maestros."FuncionarioAgrocalidad".id;


--
-- Name: Medida; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Medida" (
    id integer NOT NULL,
    nombre text NOT NULL,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: Medida_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Medida_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Medida_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Medida_id_seq" OWNED BY datos_maestros."Medida".id;


--
-- Name: Origen; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Origen" (
    id integer NOT NULL,
    nombre text NOT NULL,
    aeropuerto text,
    "idPais" integer,
    "idCaeAduana" integer
);


--
-- Name: Origen_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Origen_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Origen_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Origen_id_seq" OWNED BY datos_maestros."Origen".id;


--
-- Name: Pais; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Pais" (
    "idPais" integer NOT NULL,
    "siglasPais" text NOT NULL,
    nombre text NOT NULL,
    "paisId" integer,
    "idAcuerdo" integer,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: Pais_idPais_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Pais_idPais_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Pais_idPais_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Pais_idPais_seq" OWNED BY datos_maestros."Pais"."idPais";


--
-- Name: Producto; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."Producto" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "nombreBotanico" text,
    especie text,
    "medidaId" integer NOT NULL,
    "precioUnitario" numeric(65,30),
    estado boolean DEFAULT true NOT NULL,
    "stemsPorFull" integer,
    "sesaId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "opcionId" datos_maestros."OpcionProducto"
);


--
-- Name: Producto_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."Producto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Producto_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."Producto_id_seq" OWNED BY datos_maestros."Producto".id;


--
-- Name: ProductosAranceles; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ProductosAranceles" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    "arancelesDestino" text,
    "arancelesCodigo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductosAranceles_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."ProductosAranceles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductosAranceles_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."ProductosAranceles_id_seq" OWNED BY datos_maestros."ProductosAranceles".id;


--
-- Name: ProductosCompuesto; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ProductosCompuesto" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    destino text,
    declaracion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductosCompuesto_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."ProductosCompuesto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductosCompuesto_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."ProductosCompuesto_id_seq" OWNED BY datos_maestros."ProductosCompuesto".id;


--
-- Name: ProductosMiPro; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."ProductosMiPro" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    acuerdo text,
    "djoCode" text,
    "tariffCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductosMiPro_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."ProductosMiPro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductosMiPro_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."ProductosMiPro_id_seq" OWNED BY datos_maestros."ProductosMiPro".id;


--
-- Name: SubAgencia; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."SubAgencia" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "ciRuc" text,
    direccion text,
    telefono text,
    email text,
    ciudad text,
    pais text,
    provincia text,
    representante text,
    comision double precision,
    estado boolean DEFAULT true
);


--
-- Name: SubAgencia_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."SubAgencia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SubAgencia_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."SubAgencia_id_seq" OWNED BY datos_maestros."SubAgencia".id;


--
-- Name: TipoCarga; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."TipoCarga" (
    id integer NOT NULL,
    nombre text NOT NULL
);


--
-- Name: TipoCarga_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."TipoCarga_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TipoCarga_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."TipoCarga_id_seq" OWNED BY datos_maestros."TipoCarga".id;


--
-- Name: TipoEmbalaje; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."TipoEmbalaje" (
    id integer NOT NULL,
    nombre text NOT NULL
);


--
-- Name: TipoEmbalaje_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."TipoEmbalaje_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TipoEmbalaje_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."TipoEmbalaje_id_seq" OWNED BY datos_maestros."TipoEmbalaje".id;


--
-- Name: TipoEmbarque; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros."TipoEmbarque" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "idTipoCarga" integer,
    "idTipoEmbalaje" integer,
    regimen text,
    mercancia text,
    "harmonisedCommodity" text
);


--
-- Name: TipoEmbarque_id_seq; Type: SEQUENCE; Schema: datos_maestros; Owner: -
--

CREATE SEQUENCE datos_maestros."TipoEmbarque_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TipoEmbarque_id_seq; Type: SEQUENCE OWNED BY; Schema: datos_maestros; Owner: -
--

ALTER SEQUENCE datos_maestros."TipoEmbarque_id_seq" OWNED BY datos_maestros."TipoEmbarque".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: datos_maestros; Owner: -
--

CREATE TABLE datos_maestros._prisma_migrations (
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
-- Name: AcuerdoArancelario idAcuerdo; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AcuerdoArancelario" ALTER COLUMN "idAcuerdo" SET DEFAULT nextval('datos_maestros."AcuerdoArancelario_idAcuerdo_seq"'::regclass);


--
-- Name: Aerolinea id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Aerolinea" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Aerolinea_id_seq"'::regclass);


--
-- Name: AerolineaRuta id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."AerolineaRuta_id_seq"'::regclass);


--
-- Name: AgenciaIata id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AgenciaIata" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."AgenciaIata_id_seq"'::regclass);


--
-- Name: Bodeguero id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Bodeguero" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Bodeguero_id_seq"'::regclass);


--
-- Name: CaeAduana idCaeAduana; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."CaeAduana" ALTER COLUMN "idCaeAduana" SET DEFAULT nextval('datos_maestros."CaeAduana_idCaeAduana_seq"'::regclass);


--
-- Name: Chofer id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Chofer" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Chofer_id_seq"'::regclass);


--
-- Name: Cliente id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Cliente" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Cliente_id_seq"'::regclass);


--
-- Name: ConceptoCosto id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConceptoCosto" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."ConceptoCosto_id_seq"'::regclass);


--
-- Name: Consignatario id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Consignatario" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Consignatario_id_seq"'::regclass);


--
-- Name: Destino id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Destino" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Destino_id_seq"'::regclass);


--
-- Name: Embarcador id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Embarcador" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Embarcador_id_seq"'::regclass);


--
-- Name: Finca id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Finca" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Finca_id_seq"'::regclass);


--
-- Name: FincaChofer idFincasChoferes; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaChofer" ALTER COLUMN "idFincasChoferes" SET DEFAULT nextval('datos_maestros."FincaChofer_idFincasChoferes_seq"'::regclass);


--
-- Name: FincaProducto idFincasProductos; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaProducto" ALTER COLUMN "idFincasProductos" SET DEFAULT nextval('datos_maestros."FincaProducto_idFincasProductos_seq"'::regclass);


--
-- Name: FuncionarioAgrocalidad id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FuncionarioAgrocalidad" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."FuncionarioAgrocalidad_id_seq"'::regclass);


--
-- Name: Medida id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Medida" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Medida_id_seq"'::regclass);


--
-- Name: Origen id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Origen" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Origen_id_seq"'::regclass);


--
-- Name: Pais idPais; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Pais" ALTER COLUMN "idPais" SET DEFAULT nextval('datos_maestros."Pais_idPais_seq"'::regclass);


--
-- Name: Producto id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Producto" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."Producto_id_seq"'::regclass);


--
-- Name: ProductosAranceles id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosAranceles" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."ProductosAranceles_id_seq"'::regclass);


--
-- Name: ProductosCompuesto id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosCompuesto" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."ProductosCompuesto_id_seq"'::regclass);


--
-- Name: ProductosMiPro id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosMiPro" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."ProductosMiPro_id_seq"'::regclass);


--
-- Name: SubAgencia id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."SubAgencia" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."SubAgencia_id_seq"'::regclass);


--
-- Name: TipoCarga id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoCarga" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."TipoCarga_id_seq"'::regclass);


--
-- Name: TipoEmbalaje id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbalaje" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."TipoEmbalaje_id_seq"'::regclass);


--
-- Name: TipoEmbarque id; Type: DEFAULT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbarque" ALTER COLUMN id SET DEFAULT nextval('datos_maestros."TipoEmbarque_id_seq"'::regclass);


--
-- Data for Name: AcuerdoArancelario; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."AcuerdoArancelario" ("idAcuerdo", nombre) FROM stdin;
1	ATPDEA
2	EUR1
3	GSTP
4	SGP-CA (CANADA)
5	SGP-FR (FEDERACION RUSA)
6	SGP-UE (UNION EUROPEA)
7	SGP-US (ESTADOS UNIDOS)
8	TP
\.


--
-- Data for Name: Aerolinea; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Aerolinea" (id, nombre, "ciRuc", direccion, telefono, email, ciudad, pais, contacto, "maestraGuiasHijas", codigo, "prefijoAwb", "codigoCae", "afiliadoCass", "guiasVirtuales", "createdAt", "updatedAt", estado, modo) FROM stdin;
1	ACG AIR CARGO GERMANY	1792402956001	GEBÄUDE 1335\nD-55483 HAHN AIRPORT\nGERMANY\n	496543508462	\N	\N	GERMANY	\N	t	ACG AIR CARGO GERMANY	730	6807	f	t	2025-11-27 23:52:35.376	2025-11-28 00:42:57.577	t	EN_PIEZAS
\.


--
-- Data for Name: AerolineaRuta; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."AerolineaRuta" (id, "aerolineaId", "tipoRuta", "origenId", "destinoId", "viaAerolineaId", orden) FROM stdin;
7	1	ORIGEN	3	\N	\N	1
8	1	DESTINO1	\N	12	\N	2
9	1	VIA1	\N	\N	1	3
10	1	DESTINO2	\N	15	\N	4
11	1	VIA2	\N	\N	1	5
12	1	DESTINO3	\N	22	\N	6
13	1	VIA3	\N	\N	1	7
\.


--
-- Data for Name: AerolineasPlantilla; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."AerolineasPlantilla" ("idAerolinea", "plantillaGuiaMadre", "plantillaFormatoAerolinea", "plantillaReservas", "tarifaRate", pca) FROM stdin;
1	\N	\N	\N	1.72	0
\.


--
-- Data for Name: AgenciaIata; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."AgenciaIata" (id, "nombreShipper", "rucShipper", "direccionShipper", "telefonoShipper", "ciudadShipper", "paisShipper", "nombreCarrier", "rucCarrier", "direccionCarrier", "telefonoCarrier", "ciudadCarrier", "paisCarrier", "iataCodeCarrier", "registroExportador", "codigoOperador", "codigoConsolidador", comision, estado) FROM stdin;
1	ECUCARGA CIA. LTDA.	1791402316001	AV. INTEROCEANICA OE6-73 Y GONZALEZ SUAREZ EDIFICIO PICADILLY CENTER QUITO ECUADOR	3301260	QUITO	ECUADOR	ECUCARGA CIA. LTDA.	1791402316001	AV. INTEROCEANICA OE6-73 Y GONZALEZ SUAREZ EDIFICIO PICADILLY CENTER QUITO ECUADOR	3301260	QUITO	ECUADOR	79-1-0017-0004	CF/SESA-0754	2040	2040	2.5	t
2	PACIFIC AIR CARGO SA.	1791728726001	NICOLAS BAQUERO S/N Y 29 DE ABRIL	3945960	QUITO	ECUADOR	PACIFIC AIR CARGO S.A.	1791728726001	NICOLAS BAQUERO S/N Y 29 DE ABRIL	2452512	QUITO	ECUADOR	79-1-9000-0013		2040	2040	3.5	t
3	EBF CARGO CIA LTDA	1791856600001	NICOLAS BAQUERO S/N 29 DE ABRIL BARRIO VERGEL BAJO	3945901	QUITO	ECUADOR	EBF CARGO CIA LTDA	1791856600001	NICOLAS BAQUERO S/N 29 DE ABRIL BARRIO VERGEL BAJO	3945901	QUITO	ECUADOR	79-1-0037-0016		2040	2040	2.5	t
4	EXPERTS HANDLING CARGO S.A.	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1 ZIPCODE EC170305	3282285	QUITO	ECUADOR	PACIFIC AIR CARGO S.A.	1791728726001	NICOLAS BAQUERO S/N Y 29 DE ABRIL	3945960	QUITO	ECUADOR	79-1-9000-0013	CF/SESA-0754	2040	2040	2.5	t
5	MAROSACARGO	0	AV.EL INCA 1861 CASA 17	2447229	QUITO ECUADOR		PACIFIC AIR CARGO S.A.	1791728726001	AMAZONAS 74-89 Y RIO TOPO	3300297	QUITO	ECUADOR	79-1-9000-0013				0	t
6	WINOKE ROSES	0992448080001	BENALCAZAR 1281 Y REPUBLICA	2916521	QUITO	ECUADOR	PACIFIC AIR CARGO S.A.	1791728726001	AMAZONAS 74-89 Y RIO TOPO	3300297	QUITO	ECUADOR	79-1-9000-0013				0	t
7	PANALPINA ECUADOR S.A.	1790730166001	AV. EL INCA E4-181 Y AV. AMAZONAS	2413999	QUITO	ECUADOR	PANALPINA ECUADOR S.A.	1790730166001	AV. EL INCA E4-181 Y AV. AMAZONAS	2413999	QUITO	ECUADOR	79-1-5447-0006				0	t
8	EXPERTS HANDLING CARGO S.A.	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1 ZIPCODE 170305	3281056	QUITO	ECUADOR	PANALPINA ECUADOR S.A.	1790730166001	AV. EL INCA E4-181 Y AV. AMAZONAS	2413999	QUITO	ECUADOR	79-1-5447-0006				0	t
9	FLOWERCARGO S.A.	1791278410001	NICOLAS BAQUERO S/N y 29 DE ABRIL Tababela	5932 394 5920	QUITO	ECUADOR	FLOWERCARGO S.A.	1791278410001	NICOLAS BAQUERO S/N y 29 DE ABRIL Tababela	5932 394 5920	QUITO	ECUADOR	79-1-0019-0002	CF/SESA-0754	2040	2040	2.5	t
10	SIERRA CARGO CIA .LTDA.	1791330056001	DE LOS ROSALES N45-14 Y DE LOS TULIPANES	022277779	QUITO	ECUADOR	SIERRA CARGO CIA .LTDA.	1791330056001	DE LOS ROSALES N45-14 Y DE LOS TULIPANES	022277779	QUITO	ECUADOR	79-1-0016-0005	CF/SESA-0754	2040	2040	2.5	t
11	EXPERTS HANDLING CARGO SA	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1 ZIPCODE 170305	2499523	QUITO	ECUADOR	EXPERTS HANDLING CARGO SA	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1	600 6821	QUITO	ECUADOR	99-9-9999-9999	CF/SESA-0754	2040	2040	5	t
12	EXPERTS HANDLING CARGO SA	1792169704001	10 DE DICIEMBRE Y CHILLANES CONJ MI PASEO CS 31 CP 171104	023526170	RUMIÑAHUI	ECUADOR	FLOWERCARGO S.A.	1791278410001	NICOLAS BAQUERO S/N y 29 DE ABRIL Tababela	23945920	QUITO	ECUADOR	79-1-0019-0002	CF/SESA-0754	2040	2040	2.5	t
13	EXPERTS HANDLING CARGO S.A.	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1 ZIPCODE 170305	249 9523	QUITO	ECUADOR	ECUCARGA CIA. LTDA.	1791402316001	AV LA PRENSA Y GONZALO GALLO (QAS)	3301260	QUITO	ECUADOR	79-1-0017-0004	CF/SESA-0754	2040	2040	2.5	t
14	PACIFIC AIR CARGO S A	1791728726001	NICOLAS BAQUERO S/N Y 29 DE ABRIL	3300297	QUITO	ECUADOR	EBF CARGO CIA LTDA	1791856600001	NICOLES BAQUERO S/N Y 29 DE ABRIL	2274572	QUITO	ECUADOR	79100370016		2040	2040	2.5	t
15	EXPERTS HANDLING CARGO S.A.	1792169704001	RIO PUCUNO Y RIO BIGAL CASA 1 ZIPCODE 170305	2499523	QUITO	ECUADOR	EBF CARGO CIA LTDA	1791856600001	NICOLAS BAQUERO S/N 29 DE ABRIL BARRIO VERGEL BAJO	3945901	QUITO	ECUADOR	79100370016		2040	2040	2.5	t
16	EXPERTS HANDLING CARGO S.A.	1792169704001	RIO PUCUNO Y RIO BIGAL	2499523	QUITO	ECUADOR	TRANSINTERNATIONAL CARGO	1791130189001	AV AMAZONAS N49-143 Y JUAN HOLGUIN	246-9224	QUITO	ECUADOR	79106230000	CF/SESA-0754	2040	2040	10	t
17	ECUCARGA CIA. LTDA.	1791402316001	AV LA PRENSA Y GONZALO GALLO (QAS)	3301260	QUITO	ECUADOR	TRANSINTERNATIONAL CARGO	179130189001	AV AMAZONAS N49-143 Y JUAN HOLGUIN	2469224	QUITO	ECUADOR	79106230000	CF/SESA-0754	2040	2040	0	t
18	FLOWERCARGO S.A.	1791278410001	NICOLAS BAQUERO S/N y 29 DE ABRIL Tababela	5932 394 5920	QUITO	ECUADOR	EBF CARGO CIA LTDA	1791856600001	NICOLAS BAQUERO S/N 29 DE ABRIL BARRIO VERGEL BAJO	3945901	QUITO	ECUADOR	79100370016		2040	2040	0	t
\.


--
-- Data for Name: Bodeguero; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Bodeguero" (id, nombre, ci, "claveBodega", estado) FROM stdin;
\.


--
-- Data for Name: CaeAduana; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."CaeAduana" ("idCaeAduana", "codigoAduana", nombre) FROM stdin;
3	19	GUAYAQUIL - AEREO
4	28	GUAYAQUIL - MARITIMO
5	37	MANTA
6	46	ESMERALDAS
7	55	QUITO
8	64	PUERTO BOLIVAR
9	73	TULCAN
10	82	HUAQUILLAS
12	109	LOJA -  MACARA
13	118	SANTA ELENA
14	127	LATACUNGA
11	91	CUENCA
\.


--
-- Data for Name: Chofer; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Chofer" (id, nombre, ruc, "placasCamion", telefono, camion, estado) FROM stdin;
\.


--
-- Data for Name: Cliente; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Cliente" (id, nombre, ruc, direccion, telefono, email, ciudad, pais, "clienteCodigoPais", "fitosValor", "formA", transport, termo, mica, handling, "cuentaContable", "nombreFactura", "rucFactura", "direccionFactura", "telefonoFactura", estado, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ConceptoCosto; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConceptoCosto" (id, "plantillaId", tipo, abreviatura, valor, multiplicador) FROM stdin;
1	1	COSTO_GUIA	AWC	15	\N
2	1	COMBUSTIBLE	FSC	1.28	CHARGEABLE_WEIGHT
3	1	SEGURIDAD	SCC	0	\N
4	1	AUX_CALCULO		0	\N
5	1	IVA		0	\N
6	1	OTROS		0	\N
7	1	AUX1		0	\N
8	1	AUX2		0	\N
\.


--
-- Data for Name: Consignatario; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Consignatario" (id, nombre, ruc, direccion, "idEmbarcador", "idCliente", telefono, email, ciudad, pais, estado, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ConsignatarioCaeSice; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioCaeSice" ("idConsignatario", "consigneeNombre", "consigneeDireccion", "consigneeDocumento", "consigneeSiglasPais", "notifyNombre", "notifyDireccion", "notifyDocumento", "notifySiglasPais", "hawbNombre", "hawbDireccion", "hawbDocumento", "hawbSiglasPais", "consigneeTipoDocumento", "notifyTipoDocumento", "hawbTipoDocumento") FROM stdin;
\.


--
-- Data for Name: ConsignatarioFacturacion; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioFacturacion" ("idConsignatario", "facturaNombre", "facturaRuc", "facturaDireccion", "facturaTelefono") FROM stdin;
\.


--
-- Data for Name: ConsignatarioFito; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioFito" ("idConsignatario", "fitoDeclaredName", "fitoFormaA", "fitoNombre", "fitoDireccion", "fitoPais") FROM stdin;
\.


--
-- Data for Name: ConsignatarioGuiaH; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioGuiaH" ("idConsignatario", "guiaHConsignee", "guiaHNameAdress", "guiaHNotify") FROM stdin;
\.


--
-- Data for Name: ConsignatarioGuiaM; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioGuiaM" ("idConsignatario", "idDestino", "guiaMConsignee", "guiaMNameAddress", "guiaMNotify") FROM stdin;
\.


--
-- Data for Name: ConsignatarioTransmision; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ConsignatarioTransmision" ("idConsignatario", "consigneeNombreTrans", "consigneeDireccionTrans", "consigneeCiudadTrans", "consigneeProvinciaTrans", "consigneePaisTrans", "consigneeEueoriTrans", "notifyNombreTrans", "notifyDireccionTrans", "notifyCiudadTrans", "notifyProvinciaTrans", "notifyPaisTrans", "notifyEueoriTrans", "hawbNombreTrans", "hawbDireccionTrans", "hawbCiudadTrans", "hawbProvinciaTrans", "hawbPaisTrans", "hawbEueoriTrans") FROM stdin;
\.


--
-- Data for Name: Destino; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Destino" (id, nombre, aeropuerto, "idPais", "sesaId", "leyendaFito", "cobroFitos") FROM stdin;
35	FRA	FRANKFURT	10	1021	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn"	f
39	GYE	GUAYAQUIL	10	0		f
63	MMA	MALMO	10	593	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn"	f
33	EZE	EZE	10	1008		f
65	MSQ	MINSK	10	1436	Consignment of plant material originates and has been grown in a production site free from the quarantine pests specified in the Decision N° 157 (dated 30.11.2016) of the Council of Eurasian Economic Commision. Except pests not present in Ecuador according to resolution 122.	f
67	MVD	MONTEVIDEO	10	635	NINGUNA	f
66	MST	MST	10	0		f
49	KWI	KUWAIT	10	1359	NINGUNA	f
72	NYC	NEW YORK	10	982	NINGUNA	f
51	LED	SANT PETERSBURG	10	1036	NINGUNA	f
75	PES	PESCIA	10	0	FLOWERS ARE INSPECTED FROM OFFICIAL INSPECCION AND ARE FOUND FREE OF: Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch) and Bemisia tabaci for Flowers Gypsophila as Rules 2000/29/ Cee att IV, Part A.45.2 and A.32.2	f
53	LIM	LIMA	10	995	EL PRODUCTO SE ENCUENTRA LIBRE DE:COLLETOTRICHUM CAPSICI, ALEUROCANTHUS WOGLUMI,CHAETANAPHOTHRIPS ORCHIDII.\r\n	f
57	LTX	LATACUNGA	10	0	NINGUNA	f
73	OGZ	VLADIKAVKAZ	10	1443		f
76	PHL	PHILADELPH	10	982	NINGUNA	f
79	PTY	PANAMA	10	695	NINGUNA	f
78	POZ	POZNAN	10	992		f
83	SCL	SANTIAGO DE CHILE	10	992	LA PARTIDA O ENVIO  INSPECCIONADO SE ENCUENTRA LIBRE DE LIRIOMIZA TRIFOLLI Y THRIPS PALMI	f
85	SJO	SAN JOSE	10	7460	NINGUNA	f
50	LAX	LOS ANGELES	10	0		f
69	NJC	NIZHNEVARTOVS	10	1439	NINGUNA	f
61	MGA	MANAGUA	10	0	LA PARTIDA SE ENCUENTRA LIBRE DE ACAROS Y PLAGAS FITOSANITARIAS	f
90	TBS	TBILISI	10	0	NINGUNA	f
13	AVN	YEREVAN	10	0	NINGUNA	f
14	BAK	BAKU.	10	1301	NINGUNA	f
16	BCN	BARCELONA	10	0	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
18	BOG	BOGOTA	10	1103	NINGUNA	f
20	BRE	BREMEN	10	331	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
84	SJJ	SARAJEVO	10	0	NINGUNA	f
23	BUH	BUCHAREST	10	0	Consigment complies with Annex IV.A.I, point 45,2 b, of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point  32.2 b,  of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point 27,2 a,  of EC Plant Health Directive  2000/29/EC 	f
24	CAI	CAIRO	10	0	NINGUNA	f
87	STW	STAVROPOL	10	1036	NINGUNA	f
25	CCS	CARACAS	10	993	NINGUNA	f
26	CDG	PARIS	10	1044	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
27	CEK	SHELYABINSK	10	1441	NINGUNA	f
94	UIO	QUITO	10	0	NINGUNA	f
96	VGO	VIGO	10	0	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
98	YYZ	TORONTO	10	951	NINGUNA	f
28	CGN	COLOGNE	10	1021	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn"	f
99	ZAG	ZAGREB	10	0	NINGUNA	f
30	CUR	CURAÇAO	10	0	NINGUNA	f
31	DME	DOMODEDOVO	10	1437	NINGUNA	f
36	FRU	BISHKEK	10	0	NINGUNA	f
32	DUS	DUSSELDORF	10	421	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
89	TAS	TASHKENT	10	0		f
19	BQN	AGUADILLAS	10	0		f
100	ZRH	ZURICH	10	0	NINGUNA	f
34	FCO	FIUMICINO	10	1053	FLOWERS ARE INSPECTED FROM OFFICIAL INSPECCION AND ARE FOUND FREE OF: Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch) and Bemisia tabaci for Flowers Gypsophila as Rules 2000/29/ Cee att IV, Part A.45.2 and A.32.2	f
37	GYD	BAKU	10	1301	NINGUNA	f
17	BGI	BRIDGETOWN 	10	1011		f
91	TER	PORTUGAL	10	0		f
38	GYE	JOSE JOAQUIN DE OLMEDO	10	0	NINGUNA	f
22	BUE	BUENOS AIRES	10	0		f
40	HAV	LA HABANA	10	471	NINGUNA	f
43	IEV	KIEV	10	1120	NINGUNA	f
45	JFK	JHON F KENNEDY	10	982	NINGUNA	f
46	KGD	KALININGRAD	10	519	NINGUNA	f
54	LIS	LISBOA	10	561	"Immediately prior to their export, have been officially inspected and found free from Bemisia tabaci Genn"	f
58	LUX	LUXEMBURGO	10	0	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
60	MEL	MELBOURNE	10	1006	NINGUNA	f
93	TPA	TAMPA	10	0		f
29	COR	CORDOBA	10	0		f
95	VCP	VIRACOPOS	10	0		f
97	VNO	VILNA	10	0		f
41	HHN	HAHN	10	471		f
42	IAH	HOUSTON	10	0		f
6	ABQ	ALBUQUERQU	10	0	NINGUNA	f
15	BAQ	BARRANQUILLA	10	296		f
7	AKL	AUCKLAND	10	1008	NINGUNA	f
8	ALA	ALMATY	10	1358	"Immediately prior to their export, have been officially inspected and found free from Bemisia tabaci Genn"	f
11	ARN	ARLANDA	10	0	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
12	ATL	ATLANTA	10	956	NINGUNA	f
44	IST	ISTANBUL	10	0		f
48	KUL	KUALA LUMPUR	10	0		f
55	LPB	LA PAZ	10	0		f
56	LTU	LITUANIA	10	0		f
82	SAT	SAN ATONIO	10	0		f
86	SJU	SAN JUAN	10	0		f
9	ALC	ALICANTE	10	0	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
10	AMS	AMSTERDAM	10	1104	Consignment complies with Annex VII, point 28 b, of Regulation (EU) 2019/2072, immediately prior to their export, have been officially inspected and found free from Liriomyza sativae (Blanchard) and Amauromyza maculosa (Malloch).Consignment complies with Annex VII, point 25 b, of Regulation (EU) 2019/2072, no signs of Spodoptera eridania (Cramer), Spodoptera frugiperda Smith, or Spodoptera litura (Fabricius) have been observed at the place of production since the beginning of the last complete cycle of vegetation\r\n 	f
21	BRU	BRUSELAS	10	1024	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)" (Annex IV, Part A, Section I, 45.2 and 32.2)	f
47	KRR	KRASNODAR	10	1438	NINGUNA	f
52	LGG	LEIGE	10	0	"Inmediatamente antes de su exportacion, han sido sometidas a una inspeccion oficial y declaradas exentas de Bemisia tabaci Genn Liriomyza sativae (Blanchard) y Amauromyza maculosa (Malloch). No se han observado sintomas de Spodoptera frugiperda Smith ni Spodoptera litura (Fabricius) en la parcela de produccion desde el principio del ultimo ciclo completo de vegetacion. The cut flowers meets all the directive 2000/29/EG annex IV, capitel I, part a items 32.2 and 45.2	f
59	MAD	MADRID	10	1033	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
62	MIA	MIAMI	10	622	"THE PLACE OF PRODUCTION AS WELL AS THE CONSIGNMENT HAVE BEEN INSPECTED AND FOUND FREE OF Puccinia horiana"	f
64	MOW	MOSCOW	10	1036	NINGUNA	f
68	MXP	MALPENSA	10	1051	FLOWERS ARE INSPECTED FROM OFFICIAL INSPECCION AND ARE FOUND FREE OF: Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch) and Bemisia tabaci for Flowers Gypsophila as Rules 2000/29/ Cee att IV, Part A.45.2 and A.32.2	f
70	NQZ	ASTANA	10	1358	"The consignment is free from Frankliniella occidentalis and Liriomyza huidobrensis”. Consignment of plant material originates and has been grown in a production site free from the quarantine pests specified in the Decision N° 157 (dated 30.11.2016) of the Council of Eurasian Economic Commision. Except pests not present in Ecuador according to resolution 122.\r\n	f
71	NRT	NARITA	10	0	NINGUNA	f
74	OPO	PORTO	10	682	Consigment complies with Annex IV.A.I, point 45,2 b, of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point  32.2 b,  of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point 27,2 b,  of EC Plant Health Directive  2000/29/EC 	f
77	PLQ	KLAIPEDA	10	1301	Consigment complies with Annex IV.A.I, point 45,2 b, of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point  32.2 b,  of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point 27,2 a,  of EC Plant Health Directive  2000/29/EC 	f
80	RIX	RIGA	10	1104	Consigment complies with Annex IV.A.I, point 45,2 b, of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point  32.2 b,  of EC Plant Health Directive  2000/29/EC  Consigment complies with Annex IV.A.I, point 27,2 a,  of EC Plant Health Directive  2000/29/EC 	f
81	ROV	ROSTOV	10	1036	NINGUNA	f
88	SVO	MOSCOW	10	1036	"The consignment is free from Amauromyza maculosa, Chrysodeixis chalcites, Frankliniella schultzei, Frankliniella tritici, Spodoptera littoralis, Spodoptera litura y Thrips hawaiiensis (pests not present in Ecuador); Bemisia tabaci and Frankliniella occidentalis".	f
92	TLL	TALLINN	10	855	"IMMEDIATELY PRIOR TO THEIR EXPORT, HAVE BEEN OFFICIALLY INSPECTED AND FOUND FREE FROM Bemisia tabaci Genn and Liriomyza Sativae (Blanchard); Amauromyza Maculoza (malloch)"	f
\.


--
-- Data for Name: Embarcador; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Embarcador" (id, nombre, ci, direccion, telefono, email, ciudad, provincia, pais, "embarcadorCodigoPais", handling, estado) FROM stdin;
1	ABBU FL	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
2	AGATHA EXPORT	\N	MITAD DEL MUNDO CIUDAD DOS HEMISFERIOS	\N	\N	QUITO	PICHINCHA	\N	\N	65	t
3	ALFREDO CARLOS REIS PINHAL	197722709	COSTA PEREIRA QUINTA DE LOUREDO\nFREIXO 4625-229 MARCO CANAVESES\nCONTRIBUINTE 197722709\nOPORTO PORTUGAL	3512299516209/351968095146	a.c.pereira@iol.pt	OPORTO	\N	PORTUGAL	PT	79	t
4	BGS	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
5	Dmitri Alkhimovitch	1718225699	Urb. Lomas de Barbasquillo/Manzana A/Lotte 8	(05) 261-01-77/093591602/flowersec@gmail.com	info@flowersec.com	MANTA	MANABI	ECUADOR	EC	65	t
6	ELENA YAKOVLEVA	1708185663001	PJE.SALAZAR S/N Y GUAYAQUIL	2375488	hvlv@andinanet.net/hvlv@plus.e	QUITO	PICHINCHA	ECUADOR	EY	55	t
7	EXPERTS HANDLING CARGO S A	RUC 1792169704001	10 DE DICIEMBRE Y CHILLANES CONJ MI PASEO CS 31 CP 171104 SANGOLQUI RUMINAHUI EC PH: 3526170 EMAIL: manager@expertshcargo.com	3526170	expertshcargosa@gmail.com	RUMINAHUI	PICHINCHA	ECUADOR	EC	60	t
8	FLOR DO MINHO - COMERCIO DE FLORES UNIPESSOAL, LDA.	\N	TRAVESSA DO MONTE, 49 - MAGDALENA \n4405 -763 VILA NOVA DE GAIA PORTUGAL	00351 227129964 / 5	flor.minho@sapo.pt	OPORTO	\N	PORTUGAL	\N	80	t
9	ELEXMA S.A.  FLOWER PINK	0992449101001	RUMICHACA Y LUQUE INMOBILIARIA CORTEZ GUAYAQUIL	097053487	\N	QUITO	PICHINCHA	ECUADOR	PA	\N	t
10	FLOWERCARGO SA	1791278410001	Nicolas Baquero s/n y 29 de Abril Tababela\nCP EC 170150	5932 394 5920	\N	QUITO	PICHINCHA	ECUADOR	EC	\N	t
11	SERGUEI RIAZANOV	\N	URB.MANTA BEACH\nMANZANA C -03\nLOTE No. 03\nMANTA ECUADOR	052627721	\N	QUITO	PICHINCHA	ECUADOR	SE	54	t
\.


--
-- Data for Name: Finca; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Finca" (id, "nombreFinca", tag, "rucFinca", "tipoDocumento", "generaGuiasCertificadas", "iGeneralTelefono", "iGeneralEmail", "iGeneralCiudad", "iGeneralProvincia", "iGeneralPais", "iGeneralCodSesa", "iGeneralCodPais", "aNombre", "aCodigo", "aDireccion", estado, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FincaChofer; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."FincaChofer" ("idFincasChoferes", "idFinca", "idChofer") FROM stdin;
\.


--
-- Data for Name: FincaProducto; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."FincaProducto" ("idFincasProductos", "idFinca", "idProducto") FROM stdin;
\.


--
-- Data for Name: FuncionarioAgrocalidad; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."FuncionarioAgrocalidad" (id, nombre, telefono, email, estado, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Medida; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Medida" (id, nombre, estado) FROM stdin;
1	BUNCHES	t
2	KG	t
3	STEMS	t
\.


--
-- Data for Name: Origen; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Origen" (id, nombre, aeropuerto, "idPais", "idCaeAduana") FROM stdin;
1	UIO	MARISCAL SUCRE QUITO	22	7
2	GYE	JOSE JOAQUIN DE OLMEDO	22	3
3	LTX	AEROPUERTO INT'L COTOPAXI EC	22	14
\.


--
-- Data for Name: Pais; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Pais" ("idPais", "siglasPais", nombre, "paisId", "idAcuerdo", estado) FROM stdin;
48	TR	TURKEY	16	5	t
5	AR	ARGENTINA	14	5	t
3	AM	ARMENIA	14	5	t
6	AU	AUSTRALIA	14	5	t
34	LT	LITUANIA	71	5	t
35	LU	LUXEMBOURG	126	5	t
37	MY	MALAYSIA	0	5	t
38	NI	NICARAGUA	155	5	t
40	NZ	NEW ZEALAND	161	5	t
41	PA	PANAMA	163	5	t
42	PE	PERU	164	5	t
44	PT	PORTUGAL	173	5	t
45	RO	RUMANIA	44	5	t
46	RU	RUSSIAN FEDERATION	179	5	t
47	SE	SWEDEN	185	5	t
49	UA	UKRAINE	216	5	t
50	US	UNITED STATES OF AMERICA 	220	5	t
51	UY	URUGUAY	221	5	t
53	VE	VENEZUELA	225	5	t
4	AN	NETHERLANDS ANTILLES	8	5	t
7	AZ	AZERBAIJAN	16	5	t
8	BA	BOSNIA AND HERZEGOVINA	17	5	t
9	BB	BARBADOS	18	5	t
10	BE	BELGICA	20	5	t
11	BO	BOLIVIA	28	5	t
12	BR	BRAZIL	29	5	t
13	BY	BELARUS	34	5	t
14	CA	CANADA	36	5	t
15	CH	SWITZERLAND	41	5	t
16	CL	REPUBLICA DE CHILE	44	5	t
17	CO	COLOMBIA	47	5	t
18	CR	COSTA RICA	48	5	t
19	CU	CUBA	49	5	t
20	CZ	CZECH REPUBLIC	53	5	t
21	DE	GERMANY	1112	5	t
22	EC	ECUADOR	1113	5	t
23	EE	ESTONIA	61	5	t
24	EG	EGYPT	62	5	t
25	ES	ESPAÑA	64	5	t
27	GE	GEORGIA	74	5	t
28	HR	CROATIA	92	5	t
29	IT	ITALY	103	5	t
30	JP	JAPAN	106	5	t
31	KG	KYRGYZSTAN	108	5	t
32	KW	KUWAIT	115	5	t
33	KZ	KAZAKHSTAN	117	5	t
26	FR	FRANCE	71	6	t
39	NL	PAISES BAJOS	156	2	t
43	PL	POLONIA	14	6	t
36	LV	LATVIA	126	6	t
52	UZ	UZBEKISTAN	16	6	t
\.


--
-- Data for Name: Producto; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."Producto" (id, nombre, descripcion, "nombreBotanico", especie, "medidaId", "precioUnitario", estado, "stemsPorFull", "sesaId", "createdAt", "updatedAt", "opcionId") FROM stdin;
19	ANTHURIUMS	ANTURIO	Anthurium	sp.	3	0.070000000000000000000000000000	t	250	322	2025-11-11 22:46:29.63	2025-11-12 03:44:57.756	simple
20	ASSORTER	ASSORTER			3	0.070000000000000000000000000000	t	400	297	2025-11-11 22:46:29.632	2025-11-12 03:44:57.756	simple
21	ASTER	ASTER	Aster	sp.	3	0.160000000000000000000000000000	t	440	285	2025-11-11 22:46:29.634	2025-11-12 03:44:57.756	simple
22	ASTRANTIA	ASTRANTIA	Astrantia	sp.	3	0.500000000000000000000000000000	t	250	344	2025-11-11 22:46:29.636	2025-11-12 03:44:57.756	simple
23	BAMBOO	BAMBOO	Dracaena Sanderiana.		3	0.000000000000000000000000000000	t	250	318	2025-11-11 22:46:29.638	2025-11-12 03:44:57.756	simple
24	BANANAS	BANANA	Musa acuminata.		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.64	2025-11-12 03:44:57.756	simple
26	BOUQUETS	BOUQUETS			3	0.000000000000000000000000000000	t	250	23	2025-11-11 22:46:29.644	2025-11-12 03:44:57.756	simple
27	BOUQUETS LANAYSA	BOUQUETS LANAYSA			3	1.580000000000000000000000000000	t	30	23	2025-11-11 22:46:29.646	2025-11-12 03:44:57.756	simple
29	CAMPANULA	CAMPANULA	Campanula	sp.	3	0.000000000000000000000000000000	t	250	168	2025-11-11 22:46:29.652	2025-11-12 03:44:57.756	simple
30	CARGA DIPLOMATICA	CARGA DIPLOMATICA			3	0.000000000000000000000000000000	t	250	0	2025-11-11 22:46:29.654	2025-11-12 03:44:57.756	simple
31	CHAMPIÑON	CHAMPIÑON	Agaricus	spp	3	4.200000000000000000000000000000	t	0	0	2025-11-11 22:46:29.655	2025-11-12 03:44:57.756	simple
34	COMBO BOX6381	CLAVELES			3	0.250000000000000000000000000000	t	1200	170	2025-11-11 22:46:29.661	2025-11-27 22:39:09.869	compuesto
36	CONSOLIDATED	COMPACT DRACAENA			3	0.070000000000000000000000000000	t	250	318	2025-11-11 22:46:29.665	2025-11-12 03:44:57.756	simple
37	CORDELINE	CONSOLIDATED	Cordyline	sp.	3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.667	2025-11-12 03:44:57.756	simple
38	CRASPEDIA	CORDELINE	Craspedia	sp	3	0.070000000000000000000000000000	t	250	313	2025-11-11 22:46:29.669	2025-11-12 03:44:57.756	simple
39	CREMONS	CRASPEDIA	Chrysanthemum	sp.	3	0.150000000000000000000000000000	t	250	319	2025-11-11 22:46:29.67	2025-11-12 03:44:57.756	simple
42	CYCA	CYCA	Cyca revoluta.		3	0.070000000000000000000000000000	t	250	324	2025-11-11 22:46:29.676	2025-11-12 03:44:57.756	simple
44	DIANTHUS	DIANTHUS	Dianthus barbatus		3	0.150000000000000000000000000000	t	200	290	2025-11-11 22:46:29.68	2025-11-12 03:44:57.756	simple
45	DIEFFENBACHIA	DIEFFENBACHIA	Dieffenbachia	sp.	3	0.070000000000000000000000000000	t	250	298	2025-11-11 22:46:29.682	2025-11-12 03:44:57.756	simple
46	DRACAENA SANDERIANA	DRACAENA SANDERIANA	Dracaena Sanderiana.		3	0.070000000000000000000000000000	t	250	318	2025-11-11 22:46:29.686	2025-11-12 03:44:57.756	simple
47	ERINGIO	ERINGIO	Eryngium	sp	3	0.090000000000000000000000000000	t	440	218	2025-11-11 22:46:29.688	2025-11-12 03:44:57.756	simple
48	ESPARRAGOS	ESPARRAGOS	Asparagus officinalis L.		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.69	2025-11-12 03:44:57.756	simple
49	EUCALIPTO	EUCALIPTO	Eucalyptus	sp.	3	0.160000000000000000000000000000	t	250	306	2025-11-11 22:46:29.691	2025-11-12 03:44:57.756	simple
51	FOLLAGE	FOLLAGE	Chrysalidocarpus lutescens		3	0.070000000000000000000000000000	t	250	308	2025-11-11 22:46:29.695	2025-11-12 03:44:57.756	simple
52	FRUTAS Y PLANTAS	FRUTAS Y PLANTAS			3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.697	2025-11-12 03:44:57.756	simple
53	GERBERA	GERBERA	Gerbera	sp	3	0.180000000000000000000000000000	t	440	261	2025-11-11 22:46:29.698	2025-11-12 03:44:57.756	simple
55	GIRASOLES	GIRASOLES	Helianthus annus.		3	0.120000000000000000000000000000	t	250	172	2025-11-11 22:46:29.702	2025-11-12 03:44:57.756	simple
56	GODETHIA	GODETHIA	Godetia	sp.	3	0.140000000000000000000000000000	t	250	317	2025-11-11 22:46:29.704	2025-11-12 03:44:57.756	simple
57	GYPSOPHILA	GYPSOPHILA 	Gypsophila sp.		3	0.650000000000000000000000000000	t	600	171	2025-11-11 22:46:29.706	2025-11-12 03:44:57.756	simple
58	HANDICRAFTS	ECUATORIAN HANDICRAFTS			3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.708	2025-11-12 03:44:57.756	simple
60	HELICONIA	HELICONIA	Heliconia	sp.	3	0.070000000000000000000000000000	t	250	258	2025-11-11 22:46:29.711	2025-11-12 03:44:57.756	simple
63	HYPERICUM	HYPERICUM	Hypericum	sp.	3	0.220000000000000000000000000000	t	440	250	2025-11-11 22:46:29.72	2025-11-12 03:44:57.756	simple
64	KALANCHOE	KALANCHOE	Kalanchoe	spp.	3	0.000000000000000000000000000000	t	250	325	2025-11-11 22:46:29.721	2025-11-12 03:44:57.756	simple
66	KALE.	KALE...	Brassica oleracea var. sabellica		3	0.500000000000000000000000000000	t	250	369	2025-11-11 22:46:29.725	2025-11-12 03:44:57.756	simple
67	LARKSPUR	LARKSPUR	Delphinium	sp.	3	0.030000000000000000000000000000	t	440	270	2025-11-11 22:46:29.727	2025-11-12 03:44:57.756	simple
68	LETTUCE FERN	LETTUCE FERN	Microsorium Punctatum.		3	0.070000000000000000000000000000	t	250	0	2025-11-11 22:46:29.728	2025-11-12 03:44:57.756	simple
69	LIATRIS	LIATRIS	Liatris spicata.		3	0.200000000000000000000000000000	t	440	243	2025-11-11 22:46:29.73	2025-11-12 03:44:57.756	simple
70	LILIUM	LILIUM	Lilium	sp.	3	0.600000000000000000000000000000	t	440	241	2025-11-11 22:46:29.732	2025-11-12 03:44:57.756	simple
71	LIMONIUM	LIMONIUM	Limonium sinuatum.		3	0.180000000000000000000000000000	t	440	304	2025-11-11 22:46:29.734	2025-11-12 03:44:57.756	simple
72	LIRIOS	LIRIOS	Iris germanica.		3	0.030000000000000000000000000000	t	250	248	2025-11-11 22:46:29.736	2025-11-12 03:44:57.756	simple
73	LISIANTHUS	LISIANTHUS	Eustoma grandiflorum.		3	0.000000000000000000000000000000	t	250	293	2025-11-11 22:46:29.737	2025-11-12 03:44:57.756	simple
74	MAGAZZINES	MAGAZZINES			3	0.000000000000000000000000000000	t	250	0	2025-11-11 22:46:29.739	2025-11-12 03:44:57.756	simple
78	MINICLAVEL	MINICLAVEL	Dianthus		3	0.090000000000000000000000000000	t	500	299	2025-11-11 22:46:29.747	2025-11-12 03:44:57.756	simple
79	MIRTHO	MOLUCCELLA	Myrtus communis.	sp.	3	0.180000000000000000000000000000	t	440	231	2025-11-11 22:46:29.749	2025-11-12 03:44:57.756	simple
82	MUSA	NYLON ROLLS 	Musa		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.756	2025-11-12 03:44:57.756	simple
84	PALMA ARECA	PAMPA GRASS	Chrysalidocarpus lutescens.	sp.	3	0.100000000000000000000000000000	t	320	323	2025-11-11 22:46:29.759	2025-11-12 03:44:57.756	simple
85	PAMPA GRASS	PANDANUS	Cortaderia seliona		3	0.070000000000000000000000000000	t	250	195	2025-11-11 22:46:29.761	2025-11-12 03:44:57.756	simple
86	PANDANUS	PAPEL LAMINADO	Pandanus		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.763	2025-11-12 03:44:57.756	simple
88	PERSONAL EFFECTS	PESCADO FRESCO			3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.767	2025-11-12 03:44:57.756	simple
89	PESCADO FRESCO	PHLOX		sp.	3	0.100000000000000000000000000000	t	250	220	2025-11-11 22:46:29.768	2025-11-12 03:44:57.756	simple
90	PHLOX	PHOENIX PALM	Phlox		3	0.070000000000000000000000000000	t	250	301	2025-11-11 22:46:29.77	2025-11-12 03:44:57.756	simple
91	PHOENIX PALM	PLATANO	Phoenix roebellini.		3	0.000000000000000000000000000000	t	0	325	2025-11-11 22:46:29.772	2025-11-12 03:44:57.756	simple
92	PLATANO	PODOCAR	musa balbisiana		3	0.070000000000000000000000000000	t	250	0	2025-11-11 22:46:29.774	2025-11-12 03:44:57.756	simple
95	PROTEAS	RANUNCULOS	Protea		3	0.070000000000000000000000000000	t	250	216	2025-11-11 22:46:29.78	2025-11-12 03:44:57.756	simple
96	RANUNCULOS		Ranunculus asiaticus		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.782	2025-11-12 03:44:57.756	simple
97	REPUESTOS	ROSAS			3	0.700000000000000000000000000000	t	330	176	2025-11-11 22:46:29.786	2025-11-12 03:44:57.756	simple
98	ROSA	ROSAS	Rosa	sp.	3	0.700000000000000000000000000000	t	700	176	2025-11-11 22:46:29.788	2025-11-12 03:44:57.756	simple
99	ROSAS	RUSCUS	Rosa	sp.	3	0.070000000000000000000000000000	t	250	312	2025-11-11 22:46:29.789	2025-11-12 03:44:57.756	simple
12	ACHILEA	ACHILEA	Achilea 	sp.	3	0.000000000000000000000000000000	t	250	189	2025-11-11 22:46:29.61	2025-11-12 03:44:57.756	simple
14	ALBATROS	ALBATROS	Albatros	sp.	3	0.300000000000000000000000000000	t	440	0	2025-11-11 22:46:29.621	2025-11-12 03:44:57.756	simple
16	ALSTROEMERIA	ALSTROEMERIA	Alstroemeria	sp.	3	0.250000000000000000000000000000	t	560	320	2025-11-11 22:46:29.624	2025-11-12 03:44:57.756	simple
17	AMARANTHUS	AMARANTHUS	Amaranthus	sp.	3	0.000000000000000000000000000000	t	440	180	2025-11-11 22:46:29.626	2025-11-12 03:44:57.756	simple
18	AMIMAJUS	AMIMAJUS	Ammimajus.		3	0.200000000000000000000000000000	t	440	163	2025-11-11 22:46:29.628	2025-11-12 03:44:57.756	simple
10	ACCORDION	ACCORDION	Curculigo capitulata.		3	0.070000000000000000000000000000	t	250	325	2025-11-11 22:46:15.72	2025-11-12 03:44:57.756	simple
13	AGAPANTHUS	AGAPANTHUS	Agapanthus	sp.	3	0.300000000000000000000000000000	t	200	290	2025-11-11 22:46:29.618	2025-11-12 03:44:57.756	simple
15	ALHELI	ALHELI	Matthiola	incana	3	0.100000000000000000000000000000	t	250	292	2025-11-11 22:46:29.622	2025-11-12 03:44:57.756	simple
25	BLUPERUM	BLUPERUM	Bupleurum	sp.	3	0.020000000000000000000000000000	t	440	290	2025-11-11 22:46:29.642	2025-11-12 03:44:57.756	simple
28	CALLAS	CALLAS	Zantedeschia	sp.	3	0.600000000000000000000000000000	t	300	199	2025-11-11 22:46:29.648	2025-11-12 03:44:57.756	simple
33	CLAVELES	CRISANTEMOS	Dianthus	sp.	3	0.180000000000000000000000000000	t	320	323	2025-11-11 22:46:29.659	2025-11-12 03:44:57.756	simple
35	COMPACT DRACAENA	COMBO BOX6381	Dracaena deremensis.		3	0.260000000000000000000000000000	t	800	325	2025-11-11 22:46:29.663	2025-11-12 03:44:57.756	simple
110	TOMATE	TOMATE	Lycopersicon esculentum Mill.		3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.81	2025-11-12 03:44:57.756	simple
111	TOQUILLA	TOQUILLA	Carludovica palmata.		3	0.070000000000000000000000000000	t	250	327	2025-11-11 22:46:29.812	2025-11-12 03:44:57.756	simple
112	TRACHELIUM	TRACHELIUM	Trachelium	sp.	3	0.070000000000000000000000000000	t	400	297	2025-11-11 22:46:29.816	2025-11-12 03:44:57.756	simple
113	TREE FERN	TREE FERN	Asparagus virgatus.		3	0.070000000000000000000000000000	t	250	310	2025-11-11 22:46:29.817	2025-11-12 03:44:57.756	simple
114	TROPICAL FLOWERS	TROPICAL FLOWERS			3	0.070000000000000000000000000000	t	250	0	2025-11-11 22:46:29.819	2025-11-12 03:44:57.756	simple
115	UVILLA	UVILLA	Physalis peruviana	\N	3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.821	2025-11-27 22:36:20.545	simple
32	CRISANTEMOS	CREMONS	Chrysanthemum	sp.	3	0.120000000000000000000000000000	t	440	323	2025-11-11 22:46:29.657	2025-11-12 03:44:57.756	simple
40	CROTO LEAVE	CROTO LEAVE	Codiaeum variegatum.		3	0.070000000000000000000000000000	t	250	303	2025-11-11 22:46:29.672	2025-11-12 03:44:57.756	simple
41	CUSHION	CUSHION	Dendranthema grandiflora.		3	0.180000000000000000000000000000	t	440	323	2025-11-11 22:46:29.674	2025-11-12 03:44:57.756	simple
43	DELPHINIUM	DELPHINIUM	Delphinium	ajacis	3	0.240000000000000000000000000000	t	12	270	2025-11-11 22:46:29.678	2025-11-12 03:44:57.756	simple
50	FLOWERING KALE BRASICA	FLOWERING KALE BRASICA	Brassica	oleracea	3	0.500000000000000000000000000000	t	250	369	2025-11-11 22:46:29.693	2025-11-12 03:44:57.756	simple
77	MINGFERN	MINGFERN	Asparragus retrofactus.		3	0.070000000000000000000000000000	t	250	354	2025-11-11 22:46:29.745	2025-11-12 03:44:57.756	simple
105	MINIROSAS	MIRTHO	Rosa	sp.	3	0.070000000000000000000000000000	t	250	232	2025-11-11 22:46:29.801	2025-11-12 03:44:57.756	simple
80	MOLUCELLA	MONSTERA	Moluccella		3	0.070000000000000000000000000000	t	200	0	2025-11-11 22:46:29.752	2025-11-12 03:44:57.756	simple
81	MONSTERA	MUSA	Monstera sp.	sp.	3	0.070000000000000000000000000000	t	250	326	2025-11-11 22:46:29.754	2025-11-12 03:44:57.756	simple
54	GINGER	GINGER	Alpinia purpurata.		3	0.070000000000000000000000000000	t	250	193	2025-11-11 22:46:29.7	2025-11-12 03:44:57.756	simple
59	HELECHO CUERO	HELECHO CUERO	Rumohra Adiantiformis.		3	0.070000000000000000000000000000	t	440	323	2025-11-11 22:46:29.71	2025-11-12 03:44:57.756	simple
61	HORTENSIA	HORTENSIA	Hydrangea macrophylla.		3	0.000000000000000000000000000000	t	250	181	2025-11-11 22:46:29.713	2025-11-12 03:44:57.756	simple
62	HYDRANGEA	Hydrangea	Hydrangea	sp.	3	0.300000000000000000000000000000	t	250	318	2025-11-11 22:46:29.715	2025-11-12 03:44:57.756	simple
65	KALE	KALE	Brassica oleracea var. sabellica		3	0.500000000000000000000000000000	t	250	369	2025-11-11 22:46:29.723	2025-11-12 03:44:57.756	simple
75	MARGINATA	MARGINATA	Tynacantha marginata.		3	0.070000000000000000000000000000	t	250	196	2025-11-11 22:46:29.741	2025-11-12 03:44:57.756	simple
76	MASSANGEANA	MASSANGEANA	Dracaena fragans.		3	0.070000000000000000000000000000	t	250	353	2025-11-11 22:46:29.743	2025-11-12 03:44:57.756	simple
83	NYLON ROLLS 	PALMA ARECA		sp.	3	0.070000000000000000000000000000	t	250	311	2025-11-11 22:46:29.757	2025-11-12 03:44:57.756	simple
87	PAPEL LAMINADO	PERSONAL EFFECTS		sp.	3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.765	2025-11-12 03:44:57.756	simple
93	PODOCAR	POMPON	Podocar gracilior.	sp.	3	0.180000000000000000000000000000	t	440	323	2025-11-11 22:46:29.776	2025-11-12 03:44:57.756	simple
94	POMPON	PROTEAS	Chrysanthemum		3	0.030000000000000000000000000000	t	250	305	2025-11-11 22:46:29.778	2025-11-12 03:44:57.756	simple
100	RUSCUS	SANDERIANA	Ruscus aculeatus.		3	0.070000000000000000000000000000	t	250	318	2025-11-11 22:46:29.791	2025-11-12 03:44:57.756	simple
101	SANDERIANA	Scabiosa	Draceana Sanderiana. 		3	0.100000000000000000000000000000	t	360	228455	2025-11-11 22:46:29.793	2025-11-12 03:44:57.756	simple
102	Scabiosa	SNAPDRAGON	Scabiosa	spp.	3	0.030000000000000000000000000000	t	250	0	2025-11-11 22:46:29.795	2025-11-12 03:44:57.756	simple
103	SNAPDRAGON	SOLIDAGO	Antirrhimum majus.		3	0.160000000000000000000000000000	t	440	286	2025-11-11 22:46:29.797	2025-11-12 03:44:57.756	simple
104	SOLIDAGO	MINIROSAS	Solidago	sp.	3	0.200000000000000000000000000000	t	360	407	2025-11-11 22:46:29.799	2025-11-12 03:44:57.756	simple
106	STATICE	STATICE	Limonium sinuatum.		3	0.120000000000000000000000000000	t	250	174	2025-11-11 22:46:29.802	2025-11-12 03:44:57.756	simple
107	STOCK	STOCK	Matthiola incana.		3	0.120000000000000000000000000000	t	440	292	2025-11-11 22:46:29.804	2025-11-12 03:44:57.756	simple
108	SUNFLOWERS	SUNFLOWERS	Helianthus annus.		3	0.120000000000000000000000000000	t	250	172	2025-11-11 22:46:29.806	2025-11-12 03:44:57.756	simple
109	TEXTILES				3	0.000000000000000000000000000000	t	0	0	2025-11-11 22:46:29.808	2025-11-12 03:44:57.756	simple
\.


--
-- Data for Name: ProductosAranceles; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ProductosAranceles" (id, "productId", "arancelesDestino", "arancelesCodigo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductosCompuesto; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ProductosCompuesto" (id, "productId", destino, declaracion, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductosMiPro; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."ProductosMiPro" (id, "productId", acuerdo, "djoCode", "tariffCode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SubAgencia; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."SubAgencia" (id, nombre, "ciRuc", direccion, telefono, email, ciudad, pais, provincia, representante, comision, estado) FROM stdin;
\.


--
-- Data for Name: TipoCarga; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."TipoCarga" (id, nombre) FROM stdin;
3	CARGA GENERAL PELIGROSA
4	CONSOLIDADA
2	CARGA GENERAL
5	CONTENEDOR
6	CONTENERIZADA PELIGROSA
7	ESPECIAL
8	GRANEL SOLIDO
9	LIQUIDO
\.


--
-- Data for Name: TipoEmbalaje; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."TipoEmbalaje" (id, nombre) FROM stdin;
2	BIDON DE ACERO
3	BIDON DE ALUMINIO
4	BIDON DE CONTRACHAPADO
5	BIDON DE CARTON
6	BIDON DE PLASTICO
7	BIDON DE MADERA
8	TONEL DE MADERA
9	JERRICAN DE ACERO
10	JERRICAN DE PLASTICO
11	CAJA DE ACERO
12	CAJA DE ALUMINO
13	CAJA DE MADERA NATURAL
14	CAJA DE CONTRACHAPADO
15	CAJA DE MADERA RECONSTRUIDA
16	CAJA DE PANELES DE FIBRA
17	CAJA DE PLASTICO
18	SACO DE TEJIDO PLASTICO
19	SACO DE TELA
20	SACO DE PAPEL
21	ENVASE COMPUESTO RECIPIENTE DE PLASTICO
22	ENVASE COMPUESTO DE RECIPIENTE DE VIDRIO
23	RECIPIENTE INTERMEDIO PARA GRANELES DE PLASTICO RIGIDO
24	RECIPIENTE DE CARTON
25	RECIPIENTE DE PAPEL
26	RECIPIENTE DE MADERA
27	AEROSOL
28	PALETA MODULKAR, ANILLOS DE 80 X 60 CM
29	PALETA, FUNDA TERMORETRACTIL
30	PALETA, 200X 220 CM
31	BLISTER DOBLE
32	CONO
33	AMPOLLA, SIN PROTEGER
34	AMPOLLA, PROTEGIDA
35	ATOMIZADOR
36	CAPSULA
37	BARRIL («BARREL»)
38	BOBINA («BOBBIN»)
39	CAJÓN DE BOTELLAS, BOTELLERO
40	TABLA
41	HAZ («BUNDLE»)
42	BALÓN, SIN PROTEGER
43	BOLSA
44	ATADO
45	CUBO («BIN»)
46	BALDE («BUCKET»)
47	CESTA («BASKET»)
48	BALA, COMPRIMIDA
49	BARREÑO
50	BALA, SIN COMPRIMIR
51	BOTELLA, SIN PROTEGER, CILÍNDRICA
52	BALÓN, PROTEGIDO
53	BOTELLA, PROTEGIDA, CILÍNDRICA
54	BARRA
55	BOTELLA, SIN PROTEGER, BULBOSA
56	ROLLO («BOLT»)
57	BARRICA («BUTT»)
58	BOTELLA, PROTEGIDA, BULBOSA
59	CAJA PARA LIQUIDOS
60	CAJA («BOX»)
61	TABLA, EN HAZ/ATADO/FAJO
62	BARRAS, EN HAZ/ATADO/FAJO
63	LATA, RECTANGULAR
64	CAJÓN DE CERVEZA
65	LECHERA
66	LATA CON ASA Y PICO
67	NASA
68	COFRE («COFFER»)
69	JAULA
70	ARCÓN
71	LATA
72	ATAÚD
73	CUBA («CASK»)
74	BOBINA («COIL»)
75	CARTA (CARD)
76	CONTENEDOR NO ESPECIFICADO EXCEPTO COMO EQUIPO DE TRANSPORTE
77	GARRAFA, SIN PROTEGER
78	GARRAFA, PROTEGIDA
79	CARTUCHO
80	CAJÓN
81	CAJA («CASE»)
82	CARTÓN
83	CUBO («CUP»)
84	FUNDA
85	JAULA/BIDON DESLIZANTE
86	LATA, CILÍNDRICA
87	CILINDRO
88	LONA
89	CAJON DE PLASTICO MULTICAPA
90	CAJA DE MADERA MULTICAPA
91	CAJON DE CARTON MULTICAPA
92	JAULA CHEP (COMMONWELTH HANDLING EQUIPMENT POOL
93	CAJA CHEP (COMMONWEALTH HANDLING QUIPMENT POOL) EUROBOX
94	BIDON DE HIERRO
95	DAMAJUANA, SIN PROTEGER
96	CAJA DE CARTON PARA GRANELES
97	CAJON DE PLASTICO PARA GRANELES
98	CAJON DE MADERA PARA GRANELES
99	GENERADOR DE AEROSOL
100	DAMAJUANA, PROTEGIDA
101	TAMBOR
102	BANDEJA PLASTICO DE UN NIVEL SIN TAPA
103	BANDEJA DE MADERA,  DE UN NIVEL SIN TAPA
104	BANDEJA DE POLIESTIRENO DE UN NIVEL SIN TAPA
105	BANDEJA, DE CARTON, DE UN NIVEL, SIN TAPA
106	BANDEJA DE PLASTICO DE DOS NIVELES SIN TAPA
107	BANDEJA DE MADERA, DE DOS NIVELES SIN TAPA
108	BANDEJA, DE CARTON, DE DOS NIVELES, SIN TAPA
109	CAJA CON BASE DE PALETA
110	CAJA CON BASE DE PALETA DE MADERA
111	CAJA CON BASES DE PALETA DE CARTON
112	CAJA CON BASE PALETA DE PLASTICO
113	CAJA CON BASE DE PALETA DE METAL
114	CAJA ISOTERMICA
115	SOBRE
116	CAJÓN DE FRUTA
117	CAJÓN ARMADO
118	BARRILITO
119	FRASCO
120	COFRE PEQUEÑO (FOOTLOCKER)
121	PELÍCULA PLÁSTICA («FILMPACK»)
122	MARCO
123	ENVASE PARA ALIMENTOS (FOODTAINER)
124	SACO FLEXIBLE
125	BOMBONA DE GAS
126	VIGA
127	RECIPIENTE DE VIDRIO
128	VIGA, EN HAZ/ATADO/FAJO
129	CESTO CON ASA DE PLASTICO
130	CESTO CON ASA DE MADERA
131	CESTO CON ASA DE CARTON
132	CUBA («HOGSHEAD»)
133	CANASTA
134	EMBALAJE EXPOSITOR DE MADERA
135	EMBALAJE EXPOSITOR DE CARTON
136	EMBALAJE EXPOSITOR DE PLASTICO
137	EMBALAJE EXPOSITOR DE METAL
138	EMBALAJE DE VENTANA
139	EMBALAJE TUBULAR
140	EMBALAJE FORRADO DE PAPEL
141	EMBALAJE DE CARTON CON ORIFICIOS DE PRENSION
142	LINGOTE
143	LINGOTES, EN HAZ/ATADO/FAJO
144	JERRICÁN, RECTANGULAR
145	JARRA («JUG»)
146	TARRO
147	SACO DE YUTE
148	JERRICÁN,CILÍNDRICO
149	BARRILETE («KEG»)
150	TRONCO
151	LOTE
152	CONTENEDOR (LIFTVAN)
153	TRONCO, EN HAZ/ATADO/FAJO
154	BOLSA DE HOJAS SUPERPUESTAS
155	CAJÓN DE LECHE
156	RECIPIENTE DE METAL
157	SACO DE PAREDES MÚLTIPLES
158	ESTERA
159	RECIPIENTE FORRADO DE PLASTICO
160	CAJA DE FÓSFOROS
161	SIN OBJETO
162	SIN ENVASAR O SIN EMPAQUETAR
163	NO EMBALADO NI ACONDICIONADO UNIDAD UNICA
164	NO EMBALADO NI ACONDICIONADO VARIAS UNIDADES
165	CAJA-NIDO
166	RED («NET»)
167	RED TUBULAR DE TELA
168	COFRE («FOOTLOCKER»)
169	CAJETILLA
170	PALETA CAJA (POLLET BOX)
171	PAQUETE («PARCEL»)
172	PALETA MODULAR, AROS DE 80 X 200 CM
173	PALETA MODULAR, ANILLOS DE 80 X 120
174	CELDA SIN  TECHO PARA TRANSPORTE DE ANIMALES
175	CHAPA
176	CÁNTARO («PITCHER»)
177	TUBO («PIPE»)
178	CANASTILLA
179	FARDO («PACKAGE»)
180	CUBETA («PAIL»)
181	TABLÓN
182	SAQUITO («POUCH»)
183	RECIPIENTE PLASTICO
184	VASIJA
185	BANDEJA («TRAY») O PAQUETE DE BANDEJAS («TRAY PACK»)
186	TUBOS EN HAZ/ATADO/FAJO
187	PALETA
188	CHAPAS, EN HAZ/ATADO/FAJO
189	TABLONES, EN HAZ/ATADO/FAJO O TUBOS («PIPES»), EN HAZ/ATADO/FAJO
190	BIDON DE ACERO PARTE SUPERIOR FIJA
191	BIDON DE ACERO PARTE SUPERIOR REMOVIBLE
192	BIDON DE ALUMINIO PARTE SUPERIOR FIJA
193	BIDON DE ALUMINIO PARTE SUPERIOR REMOVIBLE
194	BIDON DE PLASTICO PARTE SUPERIOR FIJA
195	BIDON DE PLASTICO PARTE SUPERIOR REMOVIBLE
196	TONEL DE MADERA CON BITOQUE
197	TONEL DE MAERA DE PARTE SUPERIOR FIJA
198	JERRICAN DE ACERO PARTE SUPERIOR FIJA
199	JERRICAM DE ACERO PARTE SUPERIOR AMOVIBLE
200	JERRICAN DE PLASTICO PARTE SUPERIOR FIJA
201	JERRICAN DE PLASTICO PARTE SUPERIOR AMOVIBLE
\.


--
-- Data for Name: TipoEmbarque; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros."TipoEmbarque" (id, nombre, "idTipoCarga", "idTipoEmbalaje", regimen, mercancia, "harmonisedCommodity") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: datos_maestros; Owner: -
--

COPY datos_maestros._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
81c9e282-2449-4aef-962f-2b2f34dddfb8	769ec4e665798464f3ddb375529272fba8af4318388360bee048d87c4b0de318	2025-11-11 03:03:20.256844+00	20251110215038_init_datos_maestros	\N	\N	2025-11-11 03:03:20.215508+00	1
b43e51d6-f351-4cd1-b1ca-36ac8fc48764	fda8fc034ae54d466cdd0acf1db4d1832dab075bf718ab4986dab7a93b378479	2025-11-11 03:03:20.27336+00	20251110222613_add_embarcador_model	\N	\N	2025-11-11 03:03:20.258846+00	1
173948db-ce87-4aa7-ab9a-f4fe9f0d9458	42c42349e7f1639bc11c93ab7a8947d6d6ed644b8abd7867b182da36fec554ae	2025-11-11 03:26:18.979398+00	20251111032618_refactor_aerolinea_ruta_specific_fields	\N	\N	2025-11-11 03:26:18.955894+00	1
ef8ca9d5-c269-45bf-a431-0be28f90c050	acf8d1002043a88491b7bdf11d22318073f967bb1b2d0738b8c724577504ca14	2025-11-11 03:03:20.298539+00	20251110223752_rename_fields_to_camelcase	\N	\N	2025-11-11 03:03:20.275425+00	1
0325063a-3f91-4f1d-b79b-5987b606f71a	062713804ddee855874bf6c4959d0fe80abce1f6ea2d6f997c254f8b8be9a8c5	2025-11-11 03:03:20.313049+00	20251110224639_add_destino_model	\N	\N	2025-11-11 03:03:20.300515+00	1
d7428980-c7c7-4830-bf33-5da4ca1b5980	dee72d537ad23fde7512032f23e465f7497f05f0214da4b0c23c083f92442970	2025-11-11 03:03:20.342102+00	20251110225159_add_origen_and_cae_aduana_models	\N	\N	2025-11-11 03:03:20.315055+00	1
c0340aa4-ab11-4063-81d1-0f8aba249650	0dd28a93f2f9db4e898c60527520dc40fae112b13e5d46495c41df8af4a286fc	2025-11-11 03:56:36.460838+00	20251111035636_add_agencia_iata	\N	\N	2025-11-11 03:56:36.444546+00	1
0eca6e5a-58c1-4376-88c6-a931e03c7577	8b9658bccf888ad21b3ac3c8f49f3702dc2150f99e8d75d2e2c30b97982148da	2025-11-11 03:03:20.349412+00	20251110225506_make_nombres_required	\N	\N	2025-11-11 03:03:20.343983+00	1
3b991b64-666a-4126-a967-747041e38617	2dab26dbd9764c237248006619228d74f26e123d00b5ec70bca07baf41981169	2025-11-11 03:03:20.366443+00	20251111015743_add_cliente_model	\N	\N	2025-11-11 03:03:20.351343+00	1
a36b0ddf-2e8e-4e1f-a0ea-6356222286b1	331fc2ad17233755387e0769be3e293852e3115fcaaa3401b60f2d7dc7743989	2025-11-11 03:03:20.425439+00	20251111020300_add_consignatario_models	\N	\N	2025-11-11 03:03:20.368363+00	1
6252b59b-9682-45c1-8ebf-28a9b471e2c5	fb24368bac8de55d01f3b1e25fcab1e93faa042ee3d418d3450a95e14307696a	2025-11-11 04:15:33.211859+00	20251111041533_init_sub_agencia	\N	\N	2025-11-11 04:15:33.196781+00	1
b5b35af1-c035-416f-9236-c222dba2e4e4	d2a0511c3864add323051def00427ef1e5a144437fe1a4d37de0b1e30af03b25	2025-11-11 03:03:20.45889+00	20251111025233_add_finca_models	\N	\N	2025-11-11 03:03:20.427441+00	1
8af5c2b0-d14b-4680-b67b-52759d2fc26b	737bcf974b6308a99ac261e7ed677cb4edcc270b7d242f9701cc81bf414d0194	2025-11-11 03:03:20.479349+00	20251111030258_add_medida_model	\N	\N	2025-11-11 03:03:20.461084+00	1
cdb5690b-1acd-4c71-b079-84df4bdfb1c4	a76631194bc89ce2ff91ccea22ac6502b34ea5575686f00483944b5c4f77f98a	2025-11-11 03:05:43.447568+00	20251111030543_add_funcionario_agrocalidad_model	\N	\N	2025-11-11 03:05:43.432931+00	1
a73bf7c2-93fc-49ec-8914-94457c78b270	f3dfae4f7bf7d8fe63a25beda666c233812af1f22628adc5301e5859dfc25f93	2025-11-11 04:18:00.960964+00	20251111041800_init_tipo_embarque	\N	\N	2025-11-11 04:18:00.929877+00	1
1b2b52bc-92ab-4354-bef9-94057894f72a	d450d253c67c3a4ef0adcf8189409173860de93f4b8805a19d09572ac67d513f	2025-11-11 03:08:50.69577+00	20251111030850_add_bodeguero_model	\N	\N	2025-11-11 03:08:50.681283+00	1
91ba3a14-a68c-435d-b3a6-2637d976d540	3da39d0e59333bc84d0778c493823eb3c42100d9c697861e64d55da245234742	2025-11-11 03:14:15.617892+00	20251111031415_add_aerolinea_models	\N	\N	2025-11-11 03:14:15.59292+00	1
81b9dc1c-6e94-4f97-9e46-6eeb7b14a889	d17e2ac2eb441add25cd644f747d29fd4c0b04fe762eb361c2787100309b5fd7	2025-11-12 02:13:04.476043+00	20251112021304_change_opcionid_to_enum	\N	\N	2025-11-12 02:13:04.422672+00	1
\.


--
-- Name: AcuerdoArancelario_idAcuerdo_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."AcuerdoArancelario_idAcuerdo_seq"', 8, true);


--
-- Name: AerolineaRuta_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."AerolineaRuta_id_seq"', 13, true);


--
-- Name: Aerolinea_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Aerolinea_id_seq"', 1, true);


--
-- Name: AgenciaIata_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."AgenciaIata_id_seq"', 18, true);


--
-- Name: Bodeguero_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Bodeguero_id_seq"', 1, false);


--
-- Name: CaeAduana_idCaeAduana_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."CaeAduana_idCaeAduana_seq"', 14, true);


--
-- Name: Chofer_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Chofer_id_seq"', 1, false);


--
-- Name: Cliente_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Cliente_id_seq"', 1, true);


--
-- Name: ConceptoCosto_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."ConceptoCosto_id_seq"', 8, true);


--
-- Name: Consignatario_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Consignatario_id_seq"', 1, false);


--
-- Name: Destino_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Destino_id_seq"', 100, true);


--
-- Name: Embarcador_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Embarcador_id_seq"', 11, true);


--
-- Name: FincaChofer_idFincasChoferes_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."FincaChofer_idFincasChoferes_seq"', 1, false);


--
-- Name: FincaProducto_idFincasProductos_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."FincaProducto_idFincasProductos_seq"', 1, false);


--
-- Name: Finca_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Finca_id_seq"', 1, false);


--
-- Name: FuncionarioAgrocalidad_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."FuncionarioAgrocalidad_id_seq"', 1, false);


--
-- Name: Medida_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Medida_id_seq"', 3, true);


--
-- Name: Origen_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Origen_id_seq"', 3, true);


--
-- Name: Pais_idPais_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Pais_idPais_seq"', 53, true);


--
-- Name: Producto_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."Producto_id_seq"', 115, true);


--
-- Name: ProductosAranceles_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."ProductosAranceles_id_seq"', 5, true);


--
-- Name: ProductosCompuesto_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."ProductosCompuesto_id_seq"', 1, false);


--
-- Name: ProductosMiPro_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."ProductosMiPro_id_seq"', 1, false);


--
-- Name: SubAgencia_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."SubAgencia_id_seq"', 1, false);


--
-- Name: TipoCarga_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."TipoCarga_id_seq"', 9, true);


--
-- Name: TipoEmbalaje_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."TipoEmbalaje_id_seq"', 201, true);


--
-- Name: TipoEmbarque_id_seq; Type: SEQUENCE SET; Schema: datos_maestros; Owner: -
--

SELECT pg_catalog.setval('datos_maestros."TipoEmbarque_id_seq"', 2, true);


--
-- Name: AcuerdoArancelario AcuerdoArancelario_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AcuerdoArancelario"
    ADD CONSTRAINT "AcuerdoArancelario_pkey" PRIMARY KEY ("idAcuerdo");


--
-- Name: AerolineaRuta AerolineaRuta_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta"
    ADD CONSTRAINT "AerolineaRuta_pkey" PRIMARY KEY (id);


--
-- Name: Aerolinea Aerolinea_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Aerolinea"
    ADD CONSTRAINT "Aerolinea_pkey" PRIMARY KEY (id);


--
-- Name: AerolineasPlantilla AerolineasPlantilla_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineasPlantilla"
    ADD CONSTRAINT "AerolineasPlantilla_pkey" PRIMARY KEY ("idAerolinea");


--
-- Name: AgenciaIata AgenciaIata_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AgenciaIata"
    ADD CONSTRAINT "AgenciaIata_pkey" PRIMARY KEY (id);


--
-- Name: Bodeguero Bodeguero_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Bodeguero"
    ADD CONSTRAINT "Bodeguero_pkey" PRIMARY KEY (id);


--
-- Name: CaeAduana CaeAduana_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."CaeAduana"
    ADD CONSTRAINT "CaeAduana_pkey" PRIMARY KEY ("idCaeAduana");


--
-- Name: Chofer Chofer_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Chofer"
    ADD CONSTRAINT "Chofer_pkey" PRIMARY KEY (id);


--
-- Name: Cliente Cliente_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Cliente"
    ADD CONSTRAINT "Cliente_pkey" PRIMARY KEY (id);


--
-- Name: ConceptoCosto ConceptoCosto_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConceptoCosto"
    ADD CONSTRAINT "ConceptoCosto_pkey" PRIMARY KEY (id);


--
-- Name: ConsignatarioCaeSice ConsignatarioCaeSice_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioCaeSice"
    ADD CONSTRAINT "ConsignatarioCaeSice_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: ConsignatarioFacturacion ConsignatarioFacturacion_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioFacturacion"
    ADD CONSTRAINT "ConsignatarioFacturacion_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: ConsignatarioFito ConsignatarioFito_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioFito"
    ADD CONSTRAINT "ConsignatarioFito_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: ConsignatarioGuiaH ConsignatarioGuiaH_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioGuiaH"
    ADD CONSTRAINT "ConsignatarioGuiaH_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: ConsignatarioGuiaM ConsignatarioGuiaM_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioGuiaM"
    ADD CONSTRAINT "ConsignatarioGuiaM_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: ConsignatarioTransmision ConsignatarioTransmision_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioTransmision"
    ADD CONSTRAINT "ConsignatarioTransmision_pkey" PRIMARY KEY ("idConsignatario");


--
-- Name: Consignatario Consignatario_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Consignatario"
    ADD CONSTRAINT "Consignatario_pkey" PRIMARY KEY (id);


--
-- Name: Destino Destino_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Destino"
    ADD CONSTRAINT "Destino_pkey" PRIMARY KEY (id);


--
-- Name: Embarcador Embarcador_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Embarcador"
    ADD CONSTRAINT "Embarcador_pkey" PRIMARY KEY (id);


--
-- Name: FincaChofer FincaChofer_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaChofer"
    ADD CONSTRAINT "FincaChofer_pkey" PRIMARY KEY ("idFincasChoferes");


--
-- Name: FincaProducto FincaProducto_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaProducto"
    ADD CONSTRAINT "FincaProducto_pkey" PRIMARY KEY ("idFincasProductos");


--
-- Name: Finca Finca_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Finca"
    ADD CONSTRAINT "Finca_pkey" PRIMARY KEY (id);


--
-- Name: FuncionarioAgrocalidad FuncionarioAgrocalidad_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FuncionarioAgrocalidad"
    ADD CONSTRAINT "FuncionarioAgrocalidad_pkey" PRIMARY KEY (id);


--
-- Name: Medida Medida_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Medida"
    ADD CONSTRAINT "Medida_pkey" PRIMARY KEY (id);


--
-- Name: Origen Origen_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Origen"
    ADD CONSTRAINT "Origen_pkey" PRIMARY KEY (id);


--
-- Name: Pais Pais_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Pais"
    ADD CONSTRAINT "Pais_pkey" PRIMARY KEY ("idPais");


--
-- Name: Producto Producto_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Producto"
    ADD CONSTRAINT "Producto_pkey" PRIMARY KEY (id);


--
-- Name: ProductosAranceles ProductosAranceles_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosAranceles"
    ADD CONSTRAINT "ProductosAranceles_pkey" PRIMARY KEY (id);


--
-- Name: ProductosCompuesto ProductosCompuesto_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosCompuesto"
    ADD CONSTRAINT "ProductosCompuesto_pkey" PRIMARY KEY (id);


--
-- Name: ProductosMiPro ProductosMiPro_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosMiPro"
    ADD CONSTRAINT "ProductosMiPro_pkey" PRIMARY KEY (id);


--
-- Name: SubAgencia SubAgencia_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."SubAgencia"
    ADD CONSTRAINT "SubAgencia_pkey" PRIMARY KEY (id);


--
-- Name: TipoCarga TipoCarga_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoCarga"
    ADD CONSTRAINT "TipoCarga_pkey" PRIMARY KEY (id);


--
-- Name: TipoEmbalaje TipoEmbalaje_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbalaje"
    ADD CONSTRAINT "TipoEmbalaje_pkey" PRIMARY KEY (id);


--
-- Name: TipoEmbarque TipoEmbarque_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbarque"
    ADD CONSTRAINT "TipoEmbarque_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Medida_nombre_key; Type: INDEX; Schema: datos_maestros; Owner: -
--

CREATE UNIQUE INDEX "Medida_nombre_key" ON datos_maestros."Medida" USING btree (nombre);


--
-- Name: Pais_siglasPais_key; Type: INDEX; Schema: datos_maestros; Owner: -
--

CREATE UNIQUE INDEX "Pais_siglasPais_key" ON datos_maestros."Pais" USING btree ("siglasPais");


--
-- Name: AerolineaRuta AerolineaRuta_aerolineaId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta"
    ADD CONSTRAINT "AerolineaRuta_aerolineaId_fkey" FOREIGN KEY ("aerolineaId") REFERENCES datos_maestros."Aerolinea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AerolineaRuta AerolineaRuta_destinoId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta"
    ADD CONSTRAINT "AerolineaRuta_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES datos_maestros."Destino"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AerolineaRuta AerolineaRuta_origenId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta"
    ADD CONSTRAINT "AerolineaRuta_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES datos_maestros."Origen"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AerolineaRuta AerolineaRuta_viaAerolineaId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineaRuta"
    ADD CONSTRAINT "AerolineaRuta_viaAerolineaId_fkey" FOREIGN KEY ("viaAerolineaId") REFERENCES datos_maestros."Aerolinea"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AerolineasPlantilla AerolineasPlantilla_idAerolinea_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."AerolineasPlantilla"
    ADD CONSTRAINT "AerolineasPlantilla_idAerolinea_fkey" FOREIGN KEY ("idAerolinea") REFERENCES datos_maestros."Aerolinea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConceptoCosto ConceptoCosto_plantillaId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConceptoCosto"
    ADD CONSTRAINT "ConceptoCosto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES datos_maestros."AerolineasPlantilla"("idAerolinea") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioCaeSice ConsignatarioCaeSice_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioCaeSice"
    ADD CONSTRAINT "ConsignatarioCaeSice_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioFacturacion ConsignatarioFacturacion_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioFacturacion"
    ADD CONSTRAINT "ConsignatarioFacturacion_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioFito ConsignatarioFito_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioFito"
    ADD CONSTRAINT "ConsignatarioFito_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioGuiaH ConsignatarioGuiaH_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioGuiaH"
    ADD CONSTRAINT "ConsignatarioGuiaH_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioGuiaM ConsignatarioGuiaM_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioGuiaM"
    ADD CONSTRAINT "ConsignatarioGuiaM_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsignatarioGuiaM ConsignatarioGuiaM_idDestino_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioGuiaM"
    ADD CONSTRAINT "ConsignatarioGuiaM_idDestino_fkey" FOREIGN KEY ("idDestino") REFERENCES datos_maestros."Destino"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConsignatarioTransmision ConsignatarioTransmision_idConsignatario_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ConsignatarioTransmision"
    ADD CONSTRAINT "ConsignatarioTransmision_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES datos_maestros."Consignatario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Consignatario Consignatario_idCliente_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Consignatario"
    ADD CONSTRAINT "Consignatario_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES datos_maestros."Cliente"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Consignatario Consignatario_idEmbarcador_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Consignatario"
    ADD CONSTRAINT "Consignatario_idEmbarcador_fkey" FOREIGN KEY ("idEmbarcador") REFERENCES datos_maestros."Embarcador"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Destino Destino_idPais_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Destino"
    ADD CONSTRAINT "Destino_idPais_fkey" FOREIGN KEY ("idPais") REFERENCES datos_maestros."Pais"("idPais") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FincaChofer FincaChofer_idChofer_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaChofer"
    ADD CONSTRAINT "FincaChofer_idChofer_fkey" FOREIGN KEY ("idChofer") REFERENCES datos_maestros."Chofer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FincaChofer FincaChofer_idFinca_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaChofer"
    ADD CONSTRAINT "FincaChofer_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES datos_maestros."Finca"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FincaProducto FincaProducto_idFinca_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaProducto"
    ADD CONSTRAINT "FincaProducto_idFinca_fkey" FOREIGN KEY ("idFinca") REFERENCES datos_maestros."Finca"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FincaProducto FincaProducto_idProducto_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."FincaProducto"
    ADD CONSTRAINT "FincaProducto_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES datos_maestros."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Origen Origen_idCaeAduana_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Origen"
    ADD CONSTRAINT "Origen_idCaeAduana_fkey" FOREIGN KEY ("idCaeAduana") REFERENCES datos_maestros."CaeAduana"("idCaeAduana") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Origen Origen_idPais_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Origen"
    ADD CONSTRAINT "Origen_idPais_fkey" FOREIGN KEY ("idPais") REFERENCES datos_maestros."Pais"("idPais") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Pais Pais_idAcuerdo_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Pais"
    ADD CONSTRAINT "Pais_idAcuerdo_fkey" FOREIGN KEY ("idAcuerdo") REFERENCES datos_maestros."AcuerdoArancelario"("idAcuerdo") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Producto Producto_medidaId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."Producto"
    ADD CONSTRAINT "Producto_medidaId_fkey" FOREIGN KEY ("medidaId") REFERENCES datos_maestros."Medida"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductosAranceles ProductosAranceles_productId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosAranceles"
    ADD CONSTRAINT "ProductosAranceles_productId_fkey" FOREIGN KEY ("productId") REFERENCES datos_maestros."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductosCompuesto ProductosCompuesto_productId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosCompuesto"
    ADD CONSTRAINT "ProductosCompuesto_productId_fkey" FOREIGN KEY ("productId") REFERENCES datos_maestros."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductosMiPro ProductosMiPro_productId_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."ProductosMiPro"
    ADD CONSTRAINT "ProductosMiPro_productId_fkey" FOREIGN KEY ("productId") REFERENCES datos_maestros."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TipoEmbarque TipoEmbarque_idTipoCarga_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbarque"
    ADD CONSTRAINT "TipoEmbarque_idTipoCarga_fkey" FOREIGN KEY ("idTipoCarga") REFERENCES datos_maestros."TipoCarga"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TipoEmbarque TipoEmbarque_idTipoEmbalaje_fkey; Type: FK CONSTRAINT; Schema: datos_maestros; Owner: -
--

ALTER TABLE ONLY datos_maestros."TipoEmbarque"
    ADD CONSTRAINT "TipoEmbarque_idTipoEmbalaje_fkey" FOREIGN KEY ("idTipoEmbalaje") REFERENCES datos_maestros."TipoEmbalaje"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict UA8efZyp5yuxBO2fFb3FA8Az56MbNMp8wRXkqGrMgFiVnn4EL3pXr5uLv5PQcCS

