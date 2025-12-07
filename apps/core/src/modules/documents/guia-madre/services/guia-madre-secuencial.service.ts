import { Injectable } from '@nestjs/common';
import { INCREMENTO_SECUENCIAL, INCREMENTO_ESPECIAL_6 } from '../constants/guia-madre.constants';

@Injectable()
export class GuiaMadreSecuencialService {

    /**
     * Genera secuenciales para guías madre siguiendo la lógica específica:
     * - Suma 11 (INCREMENTO_SECUENCIAL) en cada incremento.
     * - Si el último dígito es 6, suma 4 (INCREMENTO_ESPECIAL_6) en lugar de 11.
     */
    generarSecuenciales(inicial: number, cantidad: number): number[] {
        const secuenciales: number[] = [];
        let actual = inicial;

        for (let i = 0; i < cantidad; i++) {
            secuenciales.push(actual);

            // Calculate next for iteration, though not pushed until next loop if we wanted strict sequence
            // But logic says: generate N sequentials starting from X?
            // "secuenciales.push(actual)" means the first one is the initial.
            // Then we calculate the next one for the next iteration.

            const ultimoDigito = actual % 10;
            if (ultimoDigito === 6) {
                actual += INCREMENTO_ESPECIAL_6;
            } else {
                actual += INCREMENTO_SECUENCIAL;
            }
        }

        return secuenciales;
    }

    formatearNumeroGuiaMadre(prefijo: number, secuencial: number): string {
        return `${prefijo}-${secuencial}`;
    }
}
