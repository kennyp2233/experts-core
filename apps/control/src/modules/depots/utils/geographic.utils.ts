export class GeographicUtils {
  /**
   * Calcula la distancia entre dos puntos geográficos usando la fórmula Haversine
   * @param lat1 Latitud del primer punto
   * @param lng1 Longitud del primer punto
   * @param lat2 Latitud del segundo punto
   * @param lng2 Longitud del segundo punto
   * @returns Distancia en kilómetros
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convierte grados a radianes
   */
  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Valida si las coordenadas están en rangos válidos
   */
  static validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Filtra depots por proximidad geográfica
   */
  static filterByProximity(
    depots: any[],
    centerLat: number,
    centerLng: number,
    radiusKm: number
  ): any[] {
    return depots
      .map(depot => ({
        ...depot,
        distanceKm: this.calculateDistance(
          centerLat,
          centerLng,
          depot.latitude,
          depot.longitude
        )
      }))
      .filter(depot => depot.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
