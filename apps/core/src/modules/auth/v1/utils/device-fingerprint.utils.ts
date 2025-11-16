import { createHash } from 'crypto';
import { Request } from 'express';

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export class DeviceFingerprintUtils {
  /**
   * Genera fingerprint del dispositivo basado en User-Agent y otros headers
   */
  static generate(request: Request): string {
    const components = [
      request.headers['user-agent'] || '',
      request.headers['accept-language'] || '',
      request.headers['accept-encoding'] || '',
      // NO incluir IP (puede cambiar con WiFi/móvil)
    ];

    const raw = components.join('|');
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Extrae info legible del dispositivo para mostrar al usuario
   */
  static extractInfo(request: Request): DeviceInfo {
    const ua = request.headers['user-agent'] || '';

    return {
      deviceName: this.parseDeviceName(ua),
      browser: this.parseBrowser(ua),
      os: this.parseOS(ua),
      deviceType: this.parseDeviceType(ua),
    };
  }

  private static parseDeviceName(ua: string): string {
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) {
      // Try to extract Android model
      const modelMatch = ua.match(/Android.*; (.*?)\)/);
      return modelMatch ? `Android ${modelMatch[1]}` : 'Android';
    }
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  private static parseBrowser(ua: string): string {
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown Browser';
  }

  private static parseOS(ua: string): string {
    if (ua.includes('Windows NT 10')) return 'Windows 10/11';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.2')) return 'Windows 8';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Mac OS X')) {
      const versionMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
      return versionMatch ? `macOS ${versionMatch[1].replace('_', '.')}` : 'macOS';
    }
    if (ua.includes('Android')) {
      const versionMatch = ua.match(/Android (\d+\.?\d*)/);
      return versionMatch ? `Android ${versionMatch[1]}` : 'Android';
    }
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      const versionMatch = ua.match(/OS (\d+[._]\d+)/);
      return versionMatch ? `iOS ${versionMatch[1].replace('_', '.')}` : 'iOS';
    }
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
  }

  private static parseDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
    if (ua.includes('Mobile') && !ua.includes('iPad')) return 'mobile';
    if (ua.includes('Tablet') || ua.includes('iPad')) return 'tablet';
    return 'desktop';
  }
}
