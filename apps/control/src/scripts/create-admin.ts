import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔧 Creador de Administradores - Expert Control');
  console.log('==============================================\n');

  try {
    // Recopilar datos del administrador
    const username = await question('👤 Nombre de usuario: ');
    const email = await question('📧 Email: ');
    const firstName = await question('👨‍💼 Nombre: ');
    const lastName = await question('👨‍💼 Apellido: ');
    
    console.log('\n🔐 Selecciona el rol:');
    console.log('1. SUPER_ADMIN (Acceso completo)');
    console.log('2. SUPERVISOR (Gestión de workers y QR)');
    console.log('3. OPERATOR (Solo visualización)');
    
    const roleChoice = await question('Opción (1-3): ');
    
    let role: string;
    switch (roleChoice) {
      case '1':
        role = 'SUPER_ADMIN';
        break;
      case '2':
        role = 'SUPERVISOR';
        break;
      case '3':
        role = 'OPERATOR';
        break;
      default:
        role = 'SUPERVISOR';
        console.log('⚠️  Opción inválida, usando SUPERVISOR por defecto');
    }

    let password = await question('🔒 Contraseña (mín. 6 caracteres): ');
    
    // Validaciones básicas
    if (!username || username.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.admin.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      throw new Error('Ya existe un administrador con ese username o email');
    }

    // Crear el administrador
    console.log('\n🔄 Creando administrador...');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
      },
    });

    // Mostrar resumen
    console.log('\n✅ ¡Administrador creado exitosamente!');
    console.log('=====================================');
    console.log(`👤 Usuario: ${admin.username}`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👨‍💼 Nombre: ${admin.firstName} ${admin.lastName}`);
    console.log(`🔐 Rol: ${admin.role}`);
    console.log(`📅 Creado: ${admin.createdAt.toLocaleString()}`);
    console.log(`🆔 ID: ${admin.id}`);

    console.log('\n📋 Datos para el login:');
    console.log(`Usuario: ${admin.username}`);
    console.log(`Contraseña: ${password}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
