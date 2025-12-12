#!/usr/bin/env node
/**
 * Script para realizar backup de los schemas de la base de datos
 */

require('dotenv').config(); // Asegura cargar las variables de entorno
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración: mapeo de contexto -> variable de entorno de URL
// Nota: Ajustamos 'guias' a 'templates' basado en el refactor reciente
const SCHEMAS_CONFIG = [
    { name: 'usuarios', envVar: 'DATABASE_URL_USUARIOS', schemaName: 'usuarios' },
    { name: 'datos_maestros', envVar: 'DATABASE_URL_DATOS_MAESTROS', schemaName: 'datos_maestros' },
    { name: 'templates', envVar: 'DATABASE_URL_TEMPLATES', schemaName: 'templates' },
    { name: 'documentos', envVar: 'DATABASE_URL_DOCUMENTOS', schemaName: 'documentos' },
];

function runCommand(command, description) {
    console.log(`\n📦 ${description}...`);
    try {
        // Ejecutamos heredando stdio para ver feedback, pero pg_dump puede ser ruidoso
        execSync(command, { stdio: 'inherit', cwd: process.cwd() });
        console.log(`✅ ${description} - Completado`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} - Falló:`, error.message);
        return false;
    }
}

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function main() {
    console.log('🚀 Iniciando backup de schemas...\n');

    // Crear carpeta de backups
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', timestamp);
    ensureDirectoryExists(backupDir);
    console.log(`📂 Directorio de respaldo: ${backupDir}`);

    let successCount = 0;
    let failCount = 0;

    for (const { name, envVar, schemaName } of SCHEMAS_CONFIG) {
        const dbUrl = process.env[envVar] || process.env.DATABASE_URL;

        if (!dbUrl) {
            console.warn(`⚠️ No se encontró URL para ${name} (${envVar}). Saltando...`);
            failCount++;
            continue;
        }

        const outputFile = path.join(backupDir, `${name}.sql`);

        // Intentar usar Docker ya que pg_dump no está en el PATH local del usuario
        // Asumimos el contenedor 'experts-core-postgres' y usuario 'postgres' base
        const containerName = 'experts-core-postgres';
        const dbName = 'experts_core'; // O parsear de la URL si fuera dinámico

        // Comando: docker exec -i [container] pg_dump -U [user] -d [db] ... > [file]
        const command = `docker exec -i ${containerName} pg_dump -U postgres -d ${dbName} --schema=${schemaName} --no-owner --no-acl > "${outputFile}"`;

        if (runCommand(command, `Backup de schema '${schemaName}' (vía Docker)`)) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Resumen de Backup:');
    console.log(`  ✅ Exitosos: ${successCount}`);
    console.log(`  ❌ Fallidos: ${failCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (failCount > 0) process.exit(1);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
