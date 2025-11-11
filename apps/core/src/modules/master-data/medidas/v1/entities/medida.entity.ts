export class Medida {
  id: number;
  nombre: string;
  estado: boolean;
  productos?: Producto[];
}

// Interface auxiliar para las relaciones
export class Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  nombreBotanico?: string;
  especie?: string;
  medidaId: number;
  precioUnitario?: number;
  estado?: boolean;
  opcionId?: number;
  stemsPorFull?: number;
  sesaId?: number;
}