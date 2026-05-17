/**
 * STUB — los campos definitivos salen del form HTML del portal en horario
 * operativo. Ver EBF_PORTAL_TOMORROW.md. Por ahora aceptamos un map
 * arbitrario para que el contrato del controller exista y compile.
 */
export class CreateCoordinacionDto {
  /** Mapa form-encoded a postear (sin csrfmiddlewaretoken — lo agrega el service). */
  fields!: Record<string, string>;
}
