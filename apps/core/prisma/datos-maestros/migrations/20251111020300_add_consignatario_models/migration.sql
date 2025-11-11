-- CreateTable
CREATE TABLE "Consignatario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "idEmbarcador" INTEGER NOT NULL,
    "idCliente" INTEGER NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignatario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignatarioCaeSice" (
    "idConsignatario" INTEGER NOT NULL,
    "consigneeNombre" TEXT,
    "consigneeDireccion" TEXT,
    "consigneeDocumento" TEXT,
    "consigneeSiglasPais" TEXT,
    "notifyNombre" TEXT,
    "notifyDireccion" TEXT,
    "notifyDocumento" TEXT,
    "notifySiglasPais" TEXT,
    "hawbNombre" TEXT,
    "hawbDireccion" TEXT,
    "hawbDocumento" TEXT,
    "hawbSiglasPais" TEXT,
    "consigneeTipoDocumento" TEXT,
    "notifyTipoDocumento" TEXT,
    "hawbTipoDocumento" TEXT,

    CONSTRAINT "ConsignatarioCaeSice_pkey" PRIMARY KEY ("idConsignatario")
);

-- CreateTable
CREATE TABLE "ConsignatarioFacturacion" (
    "idConsignatario" INTEGER NOT NULL,
    "facturaNombre" TEXT,
    "facturaRuc" TEXT,
    "facturaDireccion" TEXT,
    "facturaTelefono" TEXT,

    CONSTRAINT "ConsignatarioFacturacion_pkey" PRIMARY KEY ("idConsignatario")
);

-- CreateTable
CREATE TABLE "ConsignatarioFito" (
    "idConsignatario" INTEGER NOT NULL,
    "fitoDeclaredName" TEXT,
    "fitoFormaA" TEXT,
    "fitoNombre" TEXT,
    "fitoDireccion" TEXT,
    "fitoPais" TEXT,

    CONSTRAINT "ConsignatarioFito_pkey" PRIMARY KEY ("idConsignatario")
);

-- CreateTable
CREATE TABLE "ConsignatarioGuiaH" (
    "idConsignatario" INTEGER NOT NULL,
    "guiaHConsignee" TEXT,
    "guiaHNameAdress" TEXT,
    "guiaHNotify" TEXT,

    CONSTRAINT "ConsignatarioGuiaH_pkey" PRIMARY KEY ("idConsignatario")
);

-- CreateTable
CREATE TABLE "ConsignatarioGuiaM" (
    "idConsignatario" INTEGER NOT NULL,
    "idDestino" INTEGER,
    "guiaMConsignee" TEXT,
    "guiaMNameAddress" TEXT,
    "guiaMNotify" TEXT,

    CONSTRAINT "ConsignatarioGuiaM_pkey" PRIMARY KEY ("idConsignatario")
);

-- CreateTable
CREATE TABLE "ConsignatarioTransmision" (
    "idConsignatario" INTEGER NOT NULL,
    "consigneeNombreTrans" TEXT,
    "consigneeDireccionTrans" TEXT,
    "consigneeCiudadTrans" TEXT,
    "consigneeProvinciaTrans" TEXT,
    "consigneePaisTrans" TEXT,
    "consigneeEueoriTrans" TEXT,
    "notifyNombreTrans" TEXT,
    "notifyDireccionTrans" TEXT,
    "notifyCiudadTrans" TEXT,
    "notifyProvinciaTrans" TEXT,
    "notifyPaisTrans" TEXT,
    "notifyEueoriTrans" TEXT,
    "hawbNombreTrans" TEXT,
    "hawbDireccionTrans" TEXT,
    "hawbCiudadTrans" TEXT,
    "hawbProvinciaTrans" TEXT,
    "hawbPaisTrans" TEXT,
    "hawbEueoriTrans" TEXT,

    CONSTRAINT "ConsignatarioTransmision_pkey" PRIMARY KEY ("idConsignatario")
);

-- AddForeignKey
ALTER TABLE "Consignatario" ADD CONSTRAINT "Consignatario_idEmbarcador_fkey" FOREIGN KEY ("idEmbarcador") REFERENCES "Embarcador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignatario" ADD CONSTRAINT "Consignatario_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioCaeSice" ADD CONSTRAINT "ConsignatarioCaeSice_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioFacturacion" ADD CONSTRAINT "ConsignatarioFacturacion_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioFito" ADD CONSTRAINT "ConsignatarioFito_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioGuiaH" ADD CONSTRAINT "ConsignatarioGuiaH_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioGuiaM" ADD CONSTRAINT "ConsignatarioGuiaM_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioGuiaM" ADD CONSTRAINT "ConsignatarioGuiaM_idDestino_fkey" FOREIGN KEY ("idDestino") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignatarioTransmision" ADD CONSTRAINT "ConsignatarioTransmision_idConsignatario_fkey" FOREIGN KEY ("idConsignatario") REFERENCES "Consignatario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
