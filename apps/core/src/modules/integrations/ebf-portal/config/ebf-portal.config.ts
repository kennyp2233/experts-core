import { registerAs } from '@nestjs/config';

const ebfPortalFactory = () => {
  const baseUrl =
    process.env.EBF_PORTAL_BASE_URL?.replace(/\/+$/, '') ||
    'https://portal.ebfcargo.com';

  return {
    baseUrl,
    username: process.env.EBF_PORTAL_USER,
    password: process.env.EBF_PORTAL_PASS,
    loginPath: '/accounts/login/',
    paths: {
      coordinacionLista: '/exportador/coordinacion/lista/',
      coordinacionHistorico: '/exportador/coordinacion/historico/',
      coordinacionDetalle: '/exportador/detalle_coordinacion/',
      daesLista: '/exportador/daes/lista/',
      logout: '/users/logout/',
    },
    timezone: 'America/Guayaquil',
    requestTimeoutMs: parseInt(
      process.env.EBF_PORTAL_TIMEOUT_MS || '20000',
      10,
    ),
  };
};

export default registerAs('ebfPortal', ebfPortalFactory);
export type EbfPortalConfig = ReturnType<typeof ebfPortalFactory>;
