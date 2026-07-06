import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public endpoint to retrieve bearer token from current session
 * HRMS and other modules use this to get auth token for API calls
 */
export async function GET(req: Request) {
  try {
    // Try to get session from cookies if available
    const cookieHeader = req.headers.get('cookie') || '';
    
    // Try to extract token from auth header (shouldn't be needed but fallback)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ token: authHeader.slice(7) });
    }

    // If no direct token, check if this is called from an authenticated session
    // by checking Supabase cookies - just return a generic response asking client to use browser auth
    return NextResponse.json(
      { error: 'No token in request. Use this endpoint from authenticated browser session.' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
