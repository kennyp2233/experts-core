import * as crypto from 'crypto';

/**
 * Utilidades criptográficas para el sistema de validación QR anti-fraude
 * Compatible con tu schema existente que usa strings para enums
 */
export class CryptoUtils {
    /**
     * Genera hash SHA256 para código QR temporal
     * Fórmula: SHA256(timestamp_bloque + secret_depot + depot_id)
     */
    static generateQRHash(
        timestamp: Date,
        depotSecret: string,
        depotId: string,
    ): string {
        // Convertir timestamp a bloque de 2 minutos
        const timestampBlock = this.getTimestampBlock(timestamp);

        const input = `${timestampBlock}${depotSecret}${depotId}`;
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    /**
     * Valida si un hash QR es válido para un depot y ventana de tiempo
     */
    static validateQRHash(
        hash: string,
        depotSecret: string,
        depotId: string,
        currentTime: Date = new Date(),
        toleranceMinutes: number = 6,
    ): boolean {
        // Validar hash actual
        const currentHash = this.generateQRHash(currentTime, depotSecret, depotId);
        if (hash === currentHash) {
            return true;
        }

        // Validar hashes dentro de ventana de tolerancia
        for (let i = 1; i <= toleranceMinutes; i++) {
            // Verificar minutos anteriores
            const pastTime = new Date(currentTime.getTime() - i * 60 * 1000);
            const pastHash = this.generateQRHash(pastTime, depotSecret, depotId);
            if (hash === pastHash) {
                return true;
            }

            // Verificar minutos futuros (para casos de desincronización)
            const futureTime = new Date(currentTime.getTime() + i * 60 * 1000);
            const futureHash = this.generateQRHash(futureTime, depotSecret, depotId);
            if (hash === futureHash) {
                return true;
            }
        }

        return false;
    }

    /**
     * Convierte timestamp a bloque de 2 minutos
     */
    static getTimestampBlock(timestamp: Date): number {
        const minutes = timestamp.getMinutes();
        const blockMinutes = Math.floor(minutes / 2) * 2;

        const blockTimestamp = new Date(timestamp);
        blockTimestamp.setMinutes(blockMinutes);
        blockTimestamp.setSeconds(0);
        blockTimestamp.setMilliseconds(0);

        return Math.floor(blockTimestamp.getTime() / 1000);
    }

    /**
     * Genera un secreto aleatorio para depot
     */
    static generateDepotSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Genera device fingerprint único
     */
    static generateDeviceFingerprint(
        deviceInfo: {
            model?: string;
            platform?: string;
            systemVersion?: string;
            appVersion?: string;
        }
    ): string {
        const input = JSON.stringify(deviceInfo) + Date.now() + Math.random();
        return crypto.createHash('sha256').update(input).digest('hex');
    }
}