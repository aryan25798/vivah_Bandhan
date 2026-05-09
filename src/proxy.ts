import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedPaths = ['/dashboard', '/onboarding', '/profile', '/admin'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected && !session) {
    // Redirect to login if no session cookie exists
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin specific protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Note: For full admin verification in middleware, we would need to verify the token 
    // but we can at least check if the cookie exists. 
    // Further check happens on the client and in API routes.
    if (!session) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/profile/:path*', '/admin/:path*'],
};
