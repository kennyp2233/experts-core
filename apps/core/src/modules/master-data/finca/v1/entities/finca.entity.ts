export class Finca {
  id: number;
  nombreFinca: string;
  tag?: string;
  rucFinca?: string;
  tipoDocumento: string;
  generaGuiasCertificadas?: boolean;
  iGeneralTelefono?: string;
  iGeneralEmail?: string;
  iGeneralCiudad?: string;
  iGeneralProvincia?: string;
  iGeneralPais?: string;
  iGeneralCodSesa?: string;
  iGeneralCodPais?: string;
  aNombre?: string;
  aCodigo?: string;
  aDireccion?: string;
  estado?: boolean;
  createdAt: Date;
  updatedAt: Date;
  fincasChoferes?: FincaChofer[];
  fincasProductos?: FincaProducto[];
}

export class FincaChofer {
  idFincasChoferes: number;
  idFinca: number;
  idChofer: number;
  finca?: Finca;
  chofer?: Chofer;
}

export class FincaProducto {
  idFincasProductos: number;
  idFinca: number;
  idProducto: number;
  finca?: Finca;
  producto?: Producto;
}

// Interfaces auxiliares para las relaciones
export class Chofer {
  id: number;
  nombre: string;
  ruc: string;
  placasCamion?: string;
  telefono?: string;
  camion?: string;
  estado?: boolean;
}

export class Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  nombreBotanico?: string;
  especie?: string;
  medidaId?: number;
  precioUnitario?: number;
  estado?: boolean;
  opcionId?: number;
  stemsPorFull?: number;
  sesaId?: number;
}