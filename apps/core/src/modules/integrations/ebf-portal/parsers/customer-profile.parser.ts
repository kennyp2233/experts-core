import type { CustomerProfile } from '../types/customer-awb.types';

const TITLE_RX =
  /<p[^>]*id=["']userDetailsModalLabel["'][^>]*>([\s\S]*?)<\/p>/i;
const EMAIL_RX = /Email:\s*([^<\s]+@[^<\s]+)/i;
const CHANGE_PWD_RX =
  /href=["']([^"']*\/password\/change\/?)["']/i;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Modal de perfil cliente — `/users/external/cliente/<id>/`. Muy delgado:
 * título (nombre comercial), email, link a cambio de password.
 */
export function parseCustomerProfile(
  id: number,
  html: string,
): CustomerProfile {
  const titleMatch = TITLE_RX.exec(html);
  const emailMatch = EMAIL_RX.exec(html);
  const pwdMatch = CHANGE_PWD_RX.exec(html);

  return {
    clienteId: id,
    displayName: titleMatch ? stripHtml(titleMatch[1]) : '',
    email: emailMatch ? emailMatch[1] : null,
    changePasswordUrl: pwdMatch ? pwdMatch[1] : '',
  };
}
