export interface ExcelProductoRow {
    // Adapter to match flexible headers or specific ones
    __EMPTY?: string;
    Producto?: string;
    Codigo?: string;
    "Nombre Comun"?: string;
    "Nombre Cientifico"?: string;
    [key: string]: any;
}

export interface ExcelPuertoRow {
    Pais?: string;
    Puerto?: string;
    Codigo?: string;
    Tipo?: string;
    [key: string]: any;
}
