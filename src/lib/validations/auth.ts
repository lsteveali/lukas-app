import { z } from 'zod';

// Must match Supabase Auth → Password requirements: minimum 8 characters and
// "letters and digits". Supabase (bcrypt) ignores characters beyond 72 bytes,
// so cap it there.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
// Same character sets Supabase checks for "letters and digits": ASCII only, so
// "ñ" or "á" alone do not count as a letter there either.
const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /[0-9]/;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres, con letras y números.`;

const email = z
  .string()
  .trim()
  .min(1, 'Escribe tu correo.')
  .email('Escribe un correo válido.')
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre.')
      .max(80, 'El nombre puede tener máximo 80 caracteres.'),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
      .max(PASSWORD_MAX, `La contraseña puede tener máximo ${PASSWORD_MAX} caracteres.`)
      .regex(HAS_LETTER, 'La contraseña debe tener al menos una letra (a–z).')
      .regex(HAS_DIGIT, 'La contraseña debe tener al menos un número.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
