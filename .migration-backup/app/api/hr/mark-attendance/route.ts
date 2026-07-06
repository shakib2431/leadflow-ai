import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { employee_id, date, status } = await request.json();

    // 1. Data Integrity Validation: Cannot mark attendance in the future
    if (new Date(date) > new Date()) {
      return NextResponse.json({ error: "Cannot mark attendance for future dates." }, { status: 400 });
    }

    // 2. Atomic Upsert: This handles both NEW marks and UPDATES to existing marks
    const { error } = await supabase
      .from('attendance_records')
      .upsert(
        { employee_id, date, status, updated_at: new Date().toISOString() },
        { onConflict: 'employee_id,date' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}