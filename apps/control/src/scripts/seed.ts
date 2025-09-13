import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  try {
    // 1. Crear Admin
    console.log('👨‍💼 Creando administrador...');
    const hashedPassword = await bcrypt.hash('180473', 10);
    
    const admin = await prisma.admin.create({
      data: {
        username: 'mauricio',
        email: 'admin@expertcontrol.com',
        password: hashedPassword,
        firstName: 'Administrador',
        lastName: 'Principal',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Admin creado: ${admin.username} (${admin.email})`);

    // 2. Crear Depot con secret
    console.log('🏢 Creando depot...');
    const depotSecret = crypto.randomBytes(32).toString('hex');
    
    const depot = await prisma.depot.create({
      data: {
        name: 'Cuarto Frio',
        address: 'Tababela',
        latitude: -0.1820944, // Lima, Perú como ejemplo
        longitude: -78.3414831,
        radius: 100,
        secret: depotSecret,
        isActive: true,
      },
    });
    console.log(`✅ Depot creado: ${depot.name}`);
    console.log(`🔐 Secret del depot: ${depotSecret}`);

    // 3. Crear 2 Choferes/Workers
    console.log('👷‍♂️ Creando choferes...');
    
    const worker1 = await prisma.worker.create({
      data: {
        employeeId: 'CHF001',
        firstName: 'Franklin',
        lastName: 'Simbaña',
        email: 'franklin@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    const worker2 = await prisma.worker.create({
      data: {
        employeeId: 'CHF002',
        firstName: 'Milton',
        lastName: 'Cabascango',
        email: 'MIlton@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    console.log(`✅ Worker 1 creado: ${worker1.firstName} ${worker1.lastName} (${worker1.employeeId})`);
    console.log(`✅ Worker 2 creado: ${worker2.firstName} ${worker2.lastName} (${worker2.employeeId})`);

    // 4. Mostrar resumen
    console.log('\n📋 RESUMEN DE DATOS CREADOS:');
    console.log('====================================');
    console.log(`👨‍💼 ADMIN:`);
    console.log(`   Usuario: ${admin.username}`);
    console.log(`   Contraseña: admin123`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Rol: ${admin.role}`);
    
    console.log(`\n🏢 DEPOT:`);
    console.log(`   Nombre: ${depot.name}`);
    console.log(`   Dirección: ${depot.address}`);
    console.log(`   Coordenadas: ${depot.latitude}, ${depot.longitude}`);
    console.log(`   Radio: ${depot.radius}m`);
    console.log(`   Secret: ${depot.secret}`);
    
    console.log(`\n👷‍♂️ WORKERS:`);
    console.log(`   1. ${worker1.firstName} ${worker1.lastName} (${worker1.employeeId})`);
    console.log(`      Email: ${worker1.email}`);
    console.log(`      Teléfono: ${worker1.phone}`);
    console.log(`   2. ${worker2.firstName} ${worker2.lastName} (${worker2.employeeId})`);
    console.log(`      Email: ${worker2.email}`);
    console.log(`      Teléfono: ${worker2.phone}`);

    console.log('\n✅ Seeding completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
