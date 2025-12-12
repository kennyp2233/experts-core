--
-- PostgreSQL database dump
--

\restrict SydtGrBUEbdAP9XPSdklqCxxvJdUeYCPyLPfyyd7Hij3OvwLJgw9xaSyY55i4Kn

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
-- Name: usuarios; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA usuarios;


--
-- Name: Role; Type: TYPE; Schema: usuarios; Owner: -
--

CREATE TYPE usuarios."Role" AS ENUM (
    'USER',
    'ADMIN',
    'FINCA',
    'CLIENTE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: TrustedDevice; Type: TABLE; Schema: usuarios; Owner: -
--

CREATE TABLE usuarios."TrustedDevice" (
    id text NOT NULL,
    "userId" text NOT NULL,
    fingerprint text NOT NULL,
    "trustToken" text NOT NULL,
    "deviceName" text NOT NULL,
    browser text NOT NULL,
    os text NOT NULL,
    "deviceType" text NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastIpAddress" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: usuarios; Owner: -
--

CREATE TABLE usuarios."User" (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    role usuarios."Role" DEFAULT 'USER'::usuarios."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: usuarios; Owner: -
--

CREATE TABLE usuarios._prisma_migrations (
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
-- Data for Name: TrustedDevice; Type: TABLE DATA; Schema: usuarios; Owner: -
--

COPY usuarios."TrustedDevice" (id, "userId", fingerprint, "trustToken", "deviceName", browser, os, "deviceType", "lastUsedAt", "lastIpAddress", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: usuarios; Owner: -
--

COPY usuarios."User" (id, email, username, password, "firstName", "lastName", "isActive", role, "createdAt", "updatedAt", "twoFactorEnabled", "twoFactorSecret") FROM stdin;
cmhtonx9v0000eda4rfpwi8vn	user@example.com	johndoe	$2b$10$GIZKcZ6ur54sI9VvNSRS2.7rUQq9VZ6tHEmXJ0dkaLuItyTJeh38i	John	Doe	t	ADMIN	2025-11-10 21:57:35.923	2025-11-10 21:57:35.923	f	\N
cmhu5khfj000010v8gokxkisy	kennyp41234@gmail.com	kennyp2233	$2b$10$HWhRWdyY3CzUf3uSkoId9.EUX3K0gRpLOy249pMt9J9/x3qFn/jHu	Kenny	Pinchao	t	ADMIN	2025-11-11 05:50:48.895	2025-11-17 00:14:41.079	f	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: usuarios; Owner: -
--

COPY usuarios._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
11590d90-4785-4fd8-82c6-d0580ea8eb57	aa0d5e127cc41bb7ab400bb277de2302d14b9eaeaa1a956f7ae95b6dc5a26123	2025-11-10 21:49:41.058275+00	20251110213843_init_usuarios	\N	\N	2025-11-10 21:49:41.036783+00	1
5e9921ed-27e8-4631-8508-d15a7a6b11a8	1b834543a860a999eb27ed1dd3ecdb120bc46659ef7a5c9398eaf56ca7d70e48	2025-11-16 21:50:51.844556+00	20251116215051_add_2fa_and_trusted_devices	\N	\N	2025-11-16 21:50:51.804997+00	1
\.


--
-- Name: TrustedDevice TrustedDevice_pkey; Type: CONSTRAINT; Schema: usuarios; Owner: -
--

ALTER TABLE ONLY usuarios."TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: usuarios; Owner: -
--

ALTER TABLE ONLY usuarios."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: usuarios; Owner: -
--

ALTER TABLE ONLY usuarios._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: TrustedDevice_fingerprint_idx; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE INDEX "TrustedDevice_fingerprint_idx" ON usuarios."TrustedDevice" USING btree (fingerprint);


--
-- Name: TrustedDevice_trustToken_idx; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE INDEX "TrustedDevice_trustToken_idx" ON usuarios."TrustedDevice" USING btree ("trustToken");


--
-- Name: TrustedDevice_trustToken_key; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE UNIQUE INDEX "TrustedDevice_trustToken_key" ON usuarios."TrustedDevice" USING btree ("trustToken");


--
-- Name: TrustedDevice_userId_fingerprint_key; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE UNIQUE INDEX "TrustedDevice_userId_fingerprint_key" ON usuarios."TrustedDevice" USING btree ("userId", fingerprint);


--
-- Name: TrustedDevice_userId_idx; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE INDEX "TrustedDevice_userId_idx" ON usuarios."TrustedDevice" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON usuarios."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: usuarios; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON usuarios."User" USING btree (username);


--
-- Name: TrustedDevice TrustedDevice_userId_fkey; Type: FK CONSTRAINT; Schema: usuarios; Owner: -
--

ALTER TABLE ONLY usuarios."TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES usuarios."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict SydtGrBUEbdAP9XPSdklqCxxvJdUeYCPyLPfyyd7Hij3OvwLJgw9xaSyY55i4Kn

