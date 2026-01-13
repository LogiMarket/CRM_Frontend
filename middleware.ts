import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no necesitan autenticación
  const publicRoutes = ['/login', '/signup', '/'];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Para otras rutas, verificar si hay token
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    // Sin token, redirigir a login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/inbox/:path*', '/inbox'],
};
