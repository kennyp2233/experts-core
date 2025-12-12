import { defineConfig } from '@prisma/config';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logDebug = (msg) => {
    fs.appendFileSync(path.join(__dirname, 'prisma-debug.log'), msg + '\n');
};

const getDatabaseUrl = () => {
    const args = process.argv;
    let schemaPath = "";

    // Find schema argument
    const schemaIndex = args.findIndex((arg) => arg.startsWith('--schema'));

    if (schemaIndex !== -1) {
        const arg = args[schemaIndex];
        if (arg.includes('=')) {
            // Handle --schema=path
            schemaPath = arg.split('=')[1];
        } else if (args[schemaIndex + 1]) {
            // Handle --schema path
            schemaPath = args[schemaIndex + 1];
        }
    }

    logDebug(`Time: ${new Date().toISOString()}`);
    logDebug(`Args: ${JSON.stringify(args)}`);
    logDebug(`Schema Path Resolved: ${schemaPath}`);

    if (!schemaPath) {
        // Fallback: Check for PRISMA_SCHEMA_CONTEXT env var
        const envContext = process.env.PRISMA_SCHEMA_CONTEXT;
        if (envContext) {
            return getUrlForContext(envContext);
        }
        return process.env.DATABASE_URL ?? "";
    }

    return getUrlForContext(schemaPath);
};

const getUrlForContext = (context: string) => {
    if (context.includes('usuarios')) {
        return process.env.DATABASE_URL_USUARIOS ?? "";
    }
    if (context.includes('datos-maestros')) {
        return process.env.DATABASE_URL_DATOS_MAESTROS ?? "";
    }
    if (context.includes('documentos')) {
        const url = process.env.DATABASE_URL_DOCUMENTOS;
        logDebug(`Matched documentos. URL exists? ${!!url}`);
        return url ?? "";
    }
    if (context.includes('templates')) {
        return process.env.DATABASE_URL_TEMPLATES ?? "";
    }
    return process.env.DATABASE_URL ?? "";
};

export default defineConfig({
    datasource: {
        url: getDatabaseUrl(),
    },
});
