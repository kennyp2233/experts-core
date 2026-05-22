import { Injectable } from '@nestjs/common';
import { EbfHttpClient } from './ebf-http.client';

/**
 * HTTP client para el rol cliente del portal (cuenta `EBF_PORTAL_CUSTOMER_USER`).
 * Subclase porque Nest necesita una clase distinta para inyectar otro
 * provider con su propio cookie jar — la cuenta cliente vive bajo
 * /customer/* y no comparte sesión con la cuenta manager (rol distinto).
 */
@Injectable()
export class EbfCustomerHttpClient extends EbfHttpClient {}
