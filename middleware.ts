import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // HRMS v2 routes: let them through, API will handle auth via bearer token
  return NextResponse.next();
}

export const config = {
  matcher: ['/hrms/v2/:path*'],
};
