import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';

/**
 * Manage company holidays
 * Used for leave balance calculations, attendance exceptions, and payroll
 */
async function handler(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const year = url.searchParams.get('year') || new Date().getFullYear().toString();
      const state = url.searchParams.get('state'); // For state-specific holidays

      let query = supabaseAdmin
        .from('holidays')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date', { ascending: true });

      if (state) {
        query = query.or(`state.eq.${state},state.is.null`); // Company-wide or state-specific
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    if (req.method === 'POST') {
      const { date, name, type = 'national', state, description } = await req.json();

      if (!date || !name) {
        return NextResponse.json({ error: 'date and name required' }, { status: 400 });
      }

      // Check if holiday already exists for this date
      const { data: existing } = await supabaseAdmin
        .from('holidays')
        .select('id')
        .eq('date', date)
        .eq('state', state || null)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Holiday already exists for this date' }, { status: 400 });
      }

      const { data: holiday, error } = await supabaseAdmin
        .from('holidays')
        .insert({
          date,
          name,
          type,
          state: state || null,
          description,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data: holiday }, { status: 201 });
    }

    if (req.method === 'PUT') {
      const { id, name, state, description } = await req.json();

      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }

      const { data: holiday, error } = await supabaseAdmin
        .from('holidays')
        .update({ name, state: state || null, description, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data: holiday }, { status: 200 });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from('holidays').delete().eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (req.method === 'PATCH') {
      // Bulk import holidays from national calendar
      const { holidays: newHolidays } = await req.json();

      if (!Array.isArray(newHolidays)) {
        return NextResponse.json({ error: 'holidays array required' }, { status: 400 });
      }

      const results = [];
      for (const holiday of newHolidays) {
        const { data, error } = await supabaseAdmin
          .from('holidays')
          .upsert(
            {
              date: holiday.date,
              name: holiday.name,
              type: holiday.type || 'national',
              state: holiday.state || null,
              description: holiday.description,
              is_active: true,
            },
            { onConflict: 'date,state' }
          )
          .select()
          .single();

        if (!error) results.push(data);
      }

      return NextResponse.json({ data: { imported: results.length, total: newHolidays.length } }, { status: 200 });
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = rateLimitMiddleware('holidays')(handler);
export const POST = rateLimitMiddleware('holidays')(handler);
export const PUT = rateLimitMiddleware('holidays')(handler);
export const DELETE = rateLimitMiddleware('holidays')(handler);
export const PATCH = rateLimitMiddleware('holidays')(handler);
