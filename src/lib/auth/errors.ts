const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed:
    'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).',
  user_already_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  email_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  weak_password: 'La contraseña es muy débil. Usa una más larga o combina letras y números.',
  email_address_invalid: 'Ese correo no es válido. Revisa que esté bien escrito.',
  email_address_not_authorized: 'No podemos enviar correos a esa dirección. Usa otro correo.',
  over_email_send_rate_limit:
    'Enviamos demasiados correos en poco tiempo. Espera unos minutos e intenta de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  signup_disabled: 'El registro está deshabilitado por ahora.',
  email_provider_disabled: 'El inicio de sesión con correo está deshabilitado por ahora.',
  user_banned: 'Esta cuenta está suspendida.',
  otp_expired: 'El enlace expiró o ya se usó. Pide uno nuevo.',
  flow_state_expired: 'El inicio de sesión tardó demasiado. Intenta de nuevo.',
  flow_state_not_found: 'No pudimos completar el inicio de sesión. Intenta de nuevo.',
  bad_code_verifier: 'No pudimos completar el inicio de sesión. Intenta de nuevo.',
  bad_oauth_state: 'No pudimos completar el inicio de sesión con Google. Intenta de nuevo.',
  bad_oauth_callback: 'No pudimos completar el inicio de sesión con Google. Intenta de nuevo.',
  provider_disabled: 'Ese método de inicio de sesión está deshabilitado.',
  request_timeout: 'El servidor tardó demasiado en responder. Intenta de nuevo.',
};

export const GENERIC_AUTH_ERROR = 'Algo salió mal. Intenta de nuevo en unos minutos.';

/** Maps a Supabase Auth error code to a user-facing message in Spanish. */
export function getAuthErrorMessage(code: string | undefined | null): string {
  if (!code) return GENERIC_AUTH_ERROR;
  return AUTH_ERROR_MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}

/** Errors passed to /login through the `error` query param. */
const LOGIN_PAGE_ERRORS: Record<string, string> = {
  callback: 'No pudimos completar el inicio de sesión. Intenta de nuevo.',
  confirm: 'El enlace de confirmación no es válido o expiró. Intenta registrarte de nuevo.',
  google: 'No pudimos iniciar sesión con Google. Intenta de nuevo.',
};

/** Only known keys produce a message, so the URL cannot inject arbitrary text. */
export function getLoginPageError(key: string | undefined): string | null {
  if (!key) return null;
  return LOGIN_PAGE_ERRORS[key] ?? null;
}
