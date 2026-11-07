import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from './auth';

const validRegister = {
  fullName: 'Ana Gómez',
  email: 'Ana@Correo.com ',
  password: 'segura123',
  confirmPassword: 'segura123',
};

describe('loginSchema', () => {
  it('normalizes the email', () => {
    const result = loginSchema.parse({ email: '  ANA@correo.com ', password: 'x' });
    expect(result.email).toBe('ana@correo.com');
  });

  it('rejects an invalid email with a Spanish message', () => {
    const result = loginSchema.safeParse({ email: 'ana', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escribe un correo válido.');
  });

  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'ana@correo.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid data', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'corta1',
      confirmPassword: 'corta1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects passwords longer than 72 characters', () => {
    const long = 'a'.repeat(73);
    const result = registerSchema.safeParse({
      ...validRegister,
      password: long,
      confirmPassword: long,
    });
    expect(result.success).toBe(false);
  });

  it('reports mismatched passwords on confirmPassword', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmPassword: 'otra1234' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
    expect(result.error?.issues[0]?.message).toBe('Las contraseñas no coinciden.');
  });
});
