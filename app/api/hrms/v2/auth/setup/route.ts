import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * HRMS Setup: Auto-register user as HR Admin on first access
 * Dev-only endpoint to bootstrap HRMS role for testing/development
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

    const userId = userRes.user.id;

    // Check if role already exists
    const { data: existing } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.role) {
      return NextResponse.json(
        { message: 'User already has role', role: existing.role },
        { status: 200 }
      );
    }

    // Create role as HR Admin
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .insert([{ user_id: userId, role: 'HR Admin' }])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'User registered as HR Admin', data },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Setup failed' }, { status: 400 });
  }
}
