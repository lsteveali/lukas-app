import { describe, expect, it } from 'vitest';

import { GENERIC_AUTH_ERROR, getAuthErrorMessage, getLoginPageError } from './errors';

describe('getAuthErrorMessage', () => {
  it('maps invalid credentials', () => {
    expect(getAuthErrorMessage('invalid_credentials')).toBe('Correo o contraseña incorrectos.');
  });

  it('maps unconfirmed email', () => {
    expect(getAuthErrorMessage('email_not_confirmed')).toMatch(/confirmas tu correo/);
  });

  it('falls back to a generic message for unknown or missing codes', () => {
    expect(getAuthErrorMessage('something_new')).toBe(GENERIC_AUTH_ERROR);
    expect(getAuthErrorMessage(undefined)).toBe(GENERIC_AUTH_ERROR);
  });
});

describe('getLoginPageError', () => {
  it('returns a message for known keys only', () => {
    expect(getLoginPageError('callback')).toMatch(/No pudimos/);
    expect(getLoginPageError('<script>')).toBeNull();
    expect(getLoginPageError(undefined)).toBeNull();
  });
});
