# Arquitectura del Módulo de Autenticación

## 📁 Estructura

```
auth/
├── auth.module.ts                      # Módulo principal con providers
└── v1/
    ├── config/
    │   └── auth.constants.ts           # Constantes centralizadas (tiempos, límites, etc)
    ├── controllers/
    │   ├── auth.controller.ts          # Endpoints de autenticación
    │   └── trusted-devices.controller.ts # Endpoints de dispositivos confiables
    ├── services/
    │   ├── auth.service.ts             # Orquestador principal
    │   ├── password.service.ts         # Gestión de contraseñas (hash, validación)
    │   ├── token.service.ts            # Gestión de JWT y refresh tokens
    │   ├── two-factor.service.ts       # Gestión de 2FA (TOTP, QR)
    │   └── trusted-devices.service.ts  # Gestión de dispositivos confiables
    ├── repositories/
    │   ├── user.repository.ts          # Abstracción de Prisma para usuarios
    │   └── trusted-device.repository.ts # Abstracción de Prisma para dispositivos
    ├── interfaces/
    │   ├── token-payload.interface.ts  # Tipos para JWT
    │   └── auth-response.interface.ts  # Tipos para respuestas HTTP
    ├── strategies/
    │   ├── jwt.strategy.ts             # Estrategia JWT de Passport
    │   └── local.strategy.ts           # Estrategia Local de Passport
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   ├── local-auth.guard.ts
    │   ├── roles.guard.ts
    │   └── admin.guard.ts
    ├── dto/
    │   ├── login.dto.ts
    │   ├── register.dto.ts
    │   ├── enable-2fa.dto.ts
    │   └── verify-2fa.dto.ts
    ├── decorators/
    │   └── roles.decorator.ts
    └── utils/
        └── device-fingerprint.utils.ts
```

## 🎯 Principios Aplicados

### 1. **Single Responsibility Principle (SRP)**
Cada servicio tiene una única responsabilidad:

- **PasswordService**: Solo maneja hashing y validación de contraseñas
- **TokenService**: Solo maneja generación y validación de tokens
- **TwoFactorService**: Solo maneja lógica de 2FA
- **TrustedDevicesService**: Solo maneja dispositivos confiables
- **AuthService**: Solo orquesta los servicios anteriores

### 2. **Don't Repeat Yourself (DRY)**
- Configuración de cookies centralizada en `AuthConstants`
- Payload JWT generado en un solo lugar (`TokenService`)
- Magic numbers eliminados y reemplazados por constantes
- Métodos auxiliares reutilizables en controllers

### 3. **Dependency Inversion Principle (DIP)**
- Repositorios abstraen el acceso a Prisma
- Servicios dependen de abstracciones, no de implementaciones concretas
- Fácil de testear con mocks

### 4. **Clean Architecture**
```
Controllers → Services → Repositories → Database
     ↓           ↓
   HTTP       Business       Data
   Layer      Logic         Access
```

## 📊 Flujo de Autenticación

### Login sin 2FA
```
1. Client → POST /auth/login
2. Controller → LocalAuthGuard (valida credenciales)
3. Controller → AuthService.twoFactor.isEnabled()
4. Si NO tiene 2FA:
   - AuthService.generateTokens()
   - Controller.setCookies()
   - Return { user }
```

### Login con 2FA
```
1. Client → POST /auth/login
2. Controller → LocalAuthGuard
3. Controller → AuthService.twoFactor.isEnabled() → TRUE
4. Controller → AuthService.trustedDevices.isTrusted()
5. Si dispositivo NO confiable:
   - Generar tempToken
   - Guardar sesión temporal en Redis
   - Return { requires2FA: true, tempToken }
6. Client → POST /auth/2fa/verify + tempToken + código
7. Controller → AuthService.twoFactor.verify()
8. Si trustDevice=true:
   - AuthService.trustedDevices.trust()
9. Completar login con tokens
```

## 🔑 Responsabilidades

### AuthService (Orquestador)
- Coordina flujo de login/registro
- Delega a servicios específicos
- NO tiene lógica de negocio directa
- Expone API simple: `authService.twoFactor.verify()`, `authService.tokens.generate()`

### PasswordService
```typescript
hash(password: string): Promise<string>
validate(password: string, hash: string): Promise<boolean>
```

### TokenService
```typescript
generateAccessToken(user: UserForToken): string
generateRefreshToken(userId: string): Promise<string>
validateRefreshToken(token: string): Promise<string | null>
revokeRefreshToken(userId: string, token: string): Promise<void>
```

### TwoFactorService
```typescript
generateSecret(userId: string, email: string): Promise<{ secret, qrCode }>
confirmEnable(userId: string, token: string): Promise<boolean>
verifyCode(userId: string, token: string): Promise<boolean>
disable(userId: string): Promise<boolean>
```

### TrustedDevicesService
```typescript
isTrusted(userId: string, fingerprint: string): Promise<boolean>
trust(userId, fingerprint, deviceInfo, ip): Promise<void>
getAll(userId: string): Promise<Device[]>
remove(userId: string, deviceId: string): Promise<boolean>
```

## 📝 Constantes Configurables

```typescript
AuthConstants.PASSWORD.SALT_ROUNDS = 10
AuthConstants.TOKENS.ACCESS_TOKEN_EXPIRES = 15 min
AuthConstants.TOKENS.REFRESH_TOKEN_EXPIRES = 7 days
AuthConstants.TWO_FACTOR.SECRET_EXPIRY_SECONDS = 10 min
AuthConstants.TRUSTED_DEVICES.MAX_DEVICES_PER_USER = 5
AuthConstants.TRUSTED_DEVICES.TRUST_DURATION_DAYS = 30
```

## ✅ Ventajas de la Nueva Arquitectura

1. **Testeable**: Servicios pequeños y aislados fáciles de mockear
2. **Mantenible**: Cambios aislados en servicios específicos
3. **Escalable**: Fácil agregar nuevas features sin tocar todo
4. **Legible**: Código autodocumentado con responsabilidades claras
5. **Sin duplicación**: Código DRY, constantes centralizadas
6. **Seguro**: Separación clara entre capas, sin acceso directo a Prisma desde controllers

## 🔄 Migración desde Versión Anterior

### Antes (God Class - 594 líneas)
```typescript
authService.validateUser()
authService.login()
authService.generateToken()
authService.generateRefreshToken()
authService.generate2FASecret()
authService.confirm2FA()
authService.trustDevice()
// ... 20+ métodos más
```

### Ahora (Modular)
```typescript
authService.validateUser()
authService.register()
authService.generateTokens()

// Delegación clara
authService.tokens.generate()
authService.twoFactor.enable()
authService.trustedDevices.trust()
```

## 🧪 Testing

Con la nueva arquitectura, cada servicio se puede testear independientemente:

```typescript
describe('PasswordService', () => {
  it('should hash password correctly', async () => {
    const hashed = await passwordService.hash('password123');
    expect(hashed).toBeDefined();
  });
});

describe('TokenService', () => {
  it('should generate valid JWT', () => {
    const token = tokenService.generateAccessToken(mockUser);
    expect(token).toBeDefined();
  });
});
```

## 📚 Referencias

- **SOLID Principles**: https://en.wikipedia.org/wiki/SOLID
- **Clean Architecture**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **DRY Principle**: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
