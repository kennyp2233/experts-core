import * as XLSX from 'xlsx';

interface ReadExcelOptions {
    skipRows?: number; // Number of rows to skip before headers (default 0)
}

export function readExcelFromBuffer<T>(buffer: Buffer, options?: ReadExcelOptions): T[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Skip rows if specified (e.g., for title rows)
    const skipRows = options?.skipRows ?? 1; // Default skip 1 row (title row)
    range.s.r = skipRows; // Start reading from row after skip

    // Update sheet range
    sheet['!ref'] = XLSX.utils.encode_range(range);

    return XLSX.utils.sheet_to_json(sheet) as T[];
}

// Deprecated or kept for local testing if needed, but primary is now buffer
export function readExcel<T>(filePath: string): T[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet) as T[];
}

