import { PrismaClient } from '@prisma/client';
import { CryptoUtils } from '../libs/core/src/utils/crypto.utils';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Crear Depots de ejemplo
    const depot1 = await prisma.depot.create({
        data: {
            name: 'Depot Norte - Guayaquil',
            address: 'Av. Francisco de Orellana, Guayaquil',
            latitude: -2.1709979,
            longitude: -79.922359,
            radius: 150,
            secret: CryptoUtils.generateDepotSecret(),
        },
    });

    const depot2 = await prisma.depot.create({
        data: {
            name: 'Estación Central - Quito',
            address: 'Av. Mariscal Sucre, Quito',
            latitude: -0.1806532,
            longitude: -78.4678382,
            radius: 100,
            secret: CryptoUtils.generateDepotSecret(),
        },
    });

    console.log('✅ Depots creados:', { depot1: depot1.name, depot2: depot2.name });

    // Crear Workers de ejemplo
    const worker1 = await prisma.worker.create({
        data: {
            employeeId: 'EMP001',
            firstName: 'Juan Carlos',
            lastName: 'Rodríguez',
            email: 'juan.rodriguez@company.com',
            phone: '+593987654321',
            depotId: depot1.id,
        },
    });

    const worker2 = await prisma.worker.create({
        data: {
            employeeId: 'EMP002',
            firstName: 'María Elena',
            lastName: 'Santos',
            email: 'maria.santos@company.com',
            phone: '+593976543210',
            depotId: depot1.id,
        },
    });

    const worker3 = await prisma.worker.create({
        data: {
            employeeId: 'EMP003',
            firstName: 'Carlos Alberto',
            lastName: 'Vásquez',
            email: 'carlos.vasquez@company.com',
            phone: '+593965432109',
            depotId: depot2.id,
        },
    });

    console.log('✅ Workers creados:', {
        worker1: worker1.firstName + ' ' + worker1.lastName,
        worker2: worker2.firstName + ' ' + worker2.lastName,
        worker3: worker3.firstName + ' ' + worker3.lastName
    });

    // Crear Devices de ejemplo
    const device1 = await prisma.device.create({
        data: {
            deviceId: CryptoUtils.generateDeviceFingerprint({
                model: 'iPhone 13',
                platform: 'iOS',
                systemVersion: '15.0',
                appVersion: '1.0.0',
            }),
            model: 'iPhone 13',
            platform: 'iOS',
            appVersion: '1.0.0',
            workerId: worker1.id,
        },
    });

    const device2 = await prisma.device.create({
        data: {
            deviceId: CryptoUtils.generateDeviceFingerprint({
                model: 'Samsung Galaxy S21',
                platform: 'Android',
                systemVersion: '11.0',
                appVersion: '1.0.0',
            }),
            model: 'Samsung Galaxy S21',
            platform: 'Android',
            appVersion: '1.0.0',
            workerId: worker2.id,
        },
    });

    console.log('✅ Devices creados para los workers');

    // Generar algunos códigos QR de ejemplo (válidos para los próximos minutos)
    const now = new Date();

    for (const depot of [depot1, depot2]) {
        const qrHash = CryptoUtils.generateQRHash(now, depot.secret, depot.id);

        await prisma.qRCode.create({
            data: {
                hash: qrHash,
                timestamp: now,
                expiresAt: new Date(now.getTime() + 2 * 60 * 1000), // Expira en 2 minutos
                depotId: depot.id,
            },
        });
    }

    console.log('✅ Códigos QR de ejemplo generados');

    console.log('🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   • ${await prisma.depot.count()} depots creados`);
    console.log(`   • ${await prisma.worker.count()} workers creados`);
    console.log(`   • ${await prisma.device.count()} devices registrados`);
    console.log(`   • ${await prisma.qRCode.count()} códigos QR generados`);
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });