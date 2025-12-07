import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // Load env vars

const fs = require('fs');
const path = require('path');

const logDebug = (msg) => {
    fs.appendFileSync(path.join(__dirname, 'prisma-debug.log'), msg + '\n');
};

const getDatabaseUrl = () => {
    const args = process.argv;
    const schemaArg = args.find((arg) => arg.includes('--schema'));

    logDebug(`Time: ${new Date().toISOString()}`);
    logDebug(`Args: ${JSON.stringify(args)}`);
    logDebug(`Schema Arg: ${schemaArg}`);

    if (!schemaArg) {
        return process.env.DATABASE_URL ?? "";
    }

    if (schemaArg.includes('usuarios')) {
        return process.env.DATABASE_URL_USUARIOS ?? "";
    }
    if (schemaArg.includes('datos-maestros')) {
        return process.env.DATABASE_URL_DATOS_MAESTROS ?? "";
    }
    if (schemaArg.includes('documentos')) {
        const url = process.env.DATABASE_URL_DOCUMENTOS;
        logDebug(`Matched documentos. URL exists? ${!!url}`);
        return url ?? "";
    }
    if (schemaArg.includes('guias')) {
        return process.env.DATABASE_URL_GUIAS ?? "";
    }

    return process.env.DATABASE_URL ?? "";
};

export default defineConfig({
    datasource: {
        url: getDatabaseUrl(),
    },
});
