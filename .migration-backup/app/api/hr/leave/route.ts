import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { employee_id, leave_type, start_date, end_date, days_count } = await request.json();
  
  // Create request
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ employee_id, leave_type, start_date, end_date, days_count, status: 'pending' });

  return NextResponse.json({ data, error });
}