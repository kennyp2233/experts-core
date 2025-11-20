import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmployeeIdGenerator, EmployeeIdFormat } from '../modules/workers/utils/employee-id-generator.util';

@Injectable()
class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

const prisma = new PrismaService();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  // Inicializar Prisma
  await prisma.onModuleInit();

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
        latitude: -0.182287,
        longitude: -78.340967,
        radius: 100,
        secret: depotSecret,
        isActive: true,
      },
    });
    console.log(`✅ Depot creado: ${depot.name}`);
    console.log(`🔐 Secret del depot: ${depotSecret}`);

    // 3. Crear 2 Choferes/Workers
    console.log('👷‍♂️ Creando choferes...');

    const worker1EmployeeId = await EmployeeIdGenerator.generateUnique(prisma, {
      format: EmployeeIdFormat.SEQUENTIAL,
      prefix: 'EMP',
      digits: 5,
    });

    const worker1 = await prisma.worker.create({
      data: {
        employeeId: worker1EmployeeId,
        firstName: 'Franklin',
        lastName: 'Simbaña',
        email: 'franklin@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    const worker2EmployeeId = await EmployeeIdGenerator.generateUnique(prisma, {
      format: EmployeeIdFormat.SEQUENTIAL,
      prefix: 'EMP',
      digits: 5,
    });

    const worker2 = await prisma.worker.create({
      data: {
        employeeId: worker2EmployeeId,
        firstName: 'Milton',
        lastName: 'Cabascango',
        email: 'MIlton@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    const worker3EmployeeId = await EmployeeIdGenerator.generateUnique(prisma, {
      format: EmployeeIdFormat.SEQUENTIAL,
      prefix: 'EMP',
      digits: 5,
    });

    const worker3 = await prisma.worker.create({
      data: {
        employeeId: worker3EmployeeId,
        firstName: 'Santiago',
        lastName: 'Pinchao',
        email: 'santiago@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    const worker4EmployeeId = await EmployeeIdGenerator.generateUnique(prisma, {
      format: EmployeeIdFormat.SEQUENTIAL,
      prefix: 'EMP',
      digits: 5,
    });

    const worker4 = await prisma.worker.create({
      data: {
        employeeId: worker4EmployeeId,
        firstName: 'Kenny',
        lastName: 'Pinchao',
        email: 'kenny@expertcontrol.com',
        phone: '',
        status: 'ACTIVE',
        depotId: depot.id,
      },
    });

    console.log(`✅ Worker 1 creado: ${worker1.firstName} ${worker1.lastName} (${worker1.employeeId})`);
    console.log(`✅ Worker 2 creado: ${worker2.firstName} ${worker2.lastName} (${worker2.employeeId})`);
    console.log(`✅ Worker 3 creado: ${worker3.firstName} ${worker3.lastName} (${worker3.employeeId})`);
    console.log(`✅ Worker 4 creado: ${worker4.firstName} ${worker4.lastName} (${worker4.employeeId})`);

    // 4. Crear horario de trabajo por defecto para el depot
    console.log('🕒 Creando horario de trabajo por defecto...');
    const defaultSchedule = await prisma.workSchedule.create({
      data: {
        name: 'Horario Nocturno Estándar',
        description: 'Horario estándar para turnos nocturnos',
        entryStart: '20:00',
        entryEnd: '23:00',
        exitStart: '05:00',
        exitEnd: '08:00',
        entryToleranceMinutes: 15,
        exitToleranceMinutes: 15,
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]), // Lunes a Domingo
        timezone: 'America/Guayaquil',
        isStrict: false,
        isActive: true,
        depotId: depot.id,
      },
    });
    console.log(`✅ Horario por defecto creado: ${defaultSchedule.name}`);

    // 5. Asignar horarios específicos a trabajadores
    console.log('👷‍♂️ Asignando horarios específicos...');

    // Milton: 20:00 entrada, 05:00 salida
    await prisma.workerScheduleAssignment.create({
      data: {
        workerId: worker2.id, // Milton
        scheduleId: defaultSchedule.id,
        customEntryStart: '20:00',
        customEntryEnd: '20:30', // Ventana ajustada
        customExitStart: '05:00',
        customExitEnd: '05:30', // Ventana ajustada
        effectiveFrom: new Date(),
      },
    });

    // Franklin (Simbaña): 22:00 entrada, 07:00 salida
    await prisma.workerScheduleAssignment.create({
      data: {
        workerId: worker1.id, // Franklin
        scheduleId: defaultSchedule.id,
        customEntryStart: '22:00',
        customEntryEnd: '22:30', // Ventana ajustada
        customExitStart: '07:00',
        customExitEnd: '07:30', // Ventana ajustada
        effectiveFrom: new Date(),
      },
    });

    console.log('✅ Horarios asignados a trabajadores específicos');

    // 6. Mostrar resumen
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
    console.log(`   3. ${worker3.firstName} ${worker3.lastName} (${worker3.employeeId})`);
    console.log(`      Email: ${worker3.email}`);
    console.log(`      Teléfono: ${worker3.phone}`);
    console.log(`   4. ${worker4.firstName} ${worker4.lastName} (${worker4.employeeId})`);
    console.log(`      Email: ${worker4.email}`);
    console.log(`      Teléfono: ${worker4.phone}`);

    console.log(`\n🕒 HORARIO DE TRABAJO:`);
    console.log(`   Nombre: ${defaultSchedule.name}`);
    console.log(`   Entrada: ${defaultSchedule.entryStart} - ${defaultSchedule.entryEnd}`);
    console.log(`   Salida: ${defaultSchedule.exitStart} - ${defaultSchedule.exitEnd}`);
    console.log(`   Tolerancia: ${defaultSchedule.entryToleranceMinutes} min`);
    console.log(`   Días: Todos los días`);
    console.log(`   Asignaciones específicas:`);
    console.log(`     - Milton: Entrada 20:00-20:30, Salida 05:00-05:30`);
    console.log(`     - Franklin: Entrada 22:00-22:30, Salida 07:00-07:30`);

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
