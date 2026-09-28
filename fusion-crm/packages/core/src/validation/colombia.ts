import { z } from "zod";

/**
 * Calcula el Dígito de Verificación (DV) para un NIT en Colombia.
 * @param nit String numérico del NIT.
 * @returns El dígito de verificación como string, o null si el NIT es inválido.
 */
export function calculateNitDv(nit: string): string | null {
  const cleanNit = nit.replace(/\D/g, "");
  if (!cleanNit || cleanNit.length === 0) return null;

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;

  for (let i = 0; i < cleanNit.length; i++) {
    // Recorremos de derecha a izquierda
    const digit = parseInt(cleanNit.charAt(cleanNit.length - 1 - i), 10);
    if (isNaN(digit)) return null;
    sum += digit * primes[i];
  }

  const mod = sum % 11;
  if (mod === 0) return "0";
  if (mod === 1) return "1";
  return (11 - mod).toString();
}

/**
 * Verifica si un número de teléfono tiene formato válido para Colombia.
 * Soporta fijos locales (7 dígitos), móviles (10 dígitos empezando por 3)
 * con o sin prefijo +57.
 */
export function isValidColombianPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, "");
  // ^(\+57)?(3\d{9}|[60]{2}\d{7}|\d{7})$
  const regex = /^(\+57)?(3\d{9}|60\d{8}|\d{7})$/;
  return regex.test(clean);
}

/**
 * Zod schema para validar un NIT y su DV opcional.
 */
export const NitSchema = z.string().superRefine((val, ctx) => {
  const parts = val.split("-");
  const num = parts[0].replace(/\D/g, "");
  
  if (num.length < 5 || num.length > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El formato del NIT es inválido.",
    });
    return;
  }

  if (parts.length > 1) {
    const dv = parts[1].trim();
    const expectedDv = calculateNitDv(num);
    if (expectedDv !== dv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dígito de verificación incorrecto. Se esperaba ${expectedDv}.`,
        // Lo marcamos pero podríamos decidir que sea solo warning a nivel superior
      });
    }
  }
});
