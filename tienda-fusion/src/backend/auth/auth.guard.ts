import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { adminAuth } from '../../lib/firebase-admin';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      request.user = decodedToken;
      
      const email = decodedToken.email || '';
      // Asignar ADMIN automáticamente al correo solicitado
      const role = email === 'andresepulveda718@gmail.com' ? 'ADMIN' : 'CLIENTE';

      // Upsert user en la base de datos (PostgreSQL) usando Drizzle
      const result = await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: email,
          role: role,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { 
            email: email,
            ...(role === 'ADMIN' ? { role: 'ADMIN' } : {})
          },
        })
        .returning();
      
      request.dbUser = result[0];
      return true;
    } catch (error: any) {
      if (error?.code === 'auth/id-token-expired') {
        console.warn("Token de Firebase expirado, solicitando renovación al cliente");
      } else {
        console.error("Error verificando token de autenticación:", error?.message || error);
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
