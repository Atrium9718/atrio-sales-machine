import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { adminAuth } from '../../lib/firebase-admin';
import { db } from '../../db';
import { users } from '../../db/schema';

// Correos que reciben rol ADMIN automáticamente al iniciar sesión.
// Se configuran en la variable de entorno ADMIN_EMAILS (separados por coma).
export const getAdminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS || 'andresepulveda718@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Verifica un token de Firebase y devuelve el usuario de la base de datos
 * (creándolo o vinculándolo por correo si hace falta).
 */
export async function resolveDbUser(token: string) {
  const decodedToken = await adminAuth.verifyIdToken(token);
  const email = (decodedToken.email || '').trim().toLowerCase();
  if (!email) {
    throw new UnauthorizedException('La cuenta no tiene correo asociado');
  }
  // Solo correos verificados por Google/Firebase pueden ser administradores
  const isAdminEmail = decodedToken.email_verified === true && getAdminEmails().includes(email);

  // Upsert por correo: si el cliente compró antes como invitado, se vincula su cuenta
  const result = await db.insert(users)
    .values({
      uid: decodedToken.uid,
      email,
      role: isAdminEmail ? 'ADMIN' : 'CLIENTE',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        uid: decodedToken.uid,
        ...(isAdminEmail ? { role: 'ADMIN' } : {})
      },
    })
    .returning();

  return { decodedToken, dbUser: result[0] };
}

/**
 * Para rutas públicas que se comportan distinto con sesión (p. ej. precios B2B).
 * Devuelve null si no hay token o si es inválido.
 */
export async function getOptionalDbUser(request: any) {
  const authHeader: string = request?.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    return (await resolveDbUser(authHeader.split('Bearer ')[1])).dbUser;
  } catch {
    return null;
  }
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    try {
      const { decodedToken, dbUser } = await resolveDbUser(authHeader.split('Bearer ')[1]);
      request.user = decodedToken;
      request.dbUser = dbUser;
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      if (error?.code === 'auth/id-token-expired') {
        console.warn("Token de Firebase expirado, solicitando renovación al cliente");
      } else {
        console.error("Error verificando token de autenticación:", error?.message || error);
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
