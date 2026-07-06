import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employee_id');

    let query = supabaseAdmin
      .from('exit_checklist')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const { employee_id, category, task, assigned_to, due_date } = await req.json();

    if (!employee_id || !category || !task) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, category, task' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('exit_checklist')
      .insert([
        {
          employee_id,
          category,
          task,
          assigned_to,
          due_date,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
