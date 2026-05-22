import { registerAs } from '@nestjs/config';

const ebfPortalFactory = () => {
  const baseUrl =
    process.env.EBF_PORTAL_BASE_URL?.replace(/\/+$/, '') ||
    'https://portal.ebfcargo.com';

  return {
    baseUrl,
    // Cuenta rol manager/exportador
    username: process.env.EBF_PORTAL_USER,
    password: process.env.EBF_PORTAL_PASS,
    // Cuenta rol cliente (sesión separada — namespace /customer/*)
    customerUsername: process.env.EBF_PORTAL_CUSTOMER_USER,
    customerPassword: process.env.EBF_PORTAL_CUSTOMER_PASS,
    loginPath: '/accounts/login/',
    paths: {
      // === rol manager/exportador ===
      coordinacionLista: '/exportador/coordinacion/lista/',
      coordinacionHistorico: '/exportador/coordinacion/historico/',
      coordinacionDetalle: '/exportador/detalle_coordinacion/',
      daesLista: '/exportador/daes/lista/',
      logout: '/users/logout/',
      coordinarPage: '/exportador/detalle_coordinacion/',
      populateMarcacion: '/exportador/populate_consignatario/',
      populateVuelo: '/exportador/populate_doc_coordinacion_select/',
      populateDae: '/exportador/populate_exportador_dae_select/',
      vueloCard: '/exportador/detalle/vuelo/',
      detalleCreate: '/exportador/detalle/create/',
      boxWeightCalculator: '/exportador/box_weight_factor_calculator/',
      /** Update — prefix + `<detalleId>/update/`. */
      coordinacionUpdatePrefix: '/exportador/coordinacion/',
      /** Delete — prefix + `<detalleId>/delete/`. ⚠️ asimetría: delete vive bajo /detalle/ no /coordinacion/. */
      detalleDeletePrefix: '/exportador/detalle/',
      // === rol cliente ===
      customerAwbList: '/customer/awb/list/',
      /** Prefix: `${customerAwbPrefix}<id>/<info|details|customers|documents>/` */
      customerAwbPrefix: '/customer/awb/',
      /** Static media — los archivos de docs viven acá, requieren cookie de sesión. */
      customerMediaPrefix: '/media/docs_coordinacion/',
      /** Prefix del perfil cliente: `${customerProfilePrefix}<id>/` */
      customerProfilePrefix: '/users/external/cliente/',
    },
    timezone: 'America/Guayaquil',
    requestTimeoutMs: parseInt(
      process.env.EBF_PORTAL_TIMEOUT_MS || '60000',
      10,
    ),
  };
};

export default registerAs('ebfPortal', ebfPortalFactory);
export type EbfPortalConfig = ReturnType<typeof ebfPortalFactory>;
