import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { fileName, mappedData, duplicateStrategy } = await req.json();

    if (!mappedData || mappedData.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // 1. Create Initial Import History Record
    const { data: historyRecord, error: historyErr } = await supabase
      .from('import_history')
      .insert([{ 
        file_name: fileName, 
        rows_processed: mappedData.length,
        duplicate_strategy: duplicateStrategy,
        status: 'processing'
      }])
      .select().single();

    if (historyErr) throw historyErr;

    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    const errorLog: any[] = [];

    // 2. Process Rows
    for (const row of mappedData) {
      try {
        // Check for duplicates by Email or Phone
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(`email.eq."${row.email}",phone.eq."${row.phone}"`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
          
          if (duplicateStrategy === 'skip') {
            continue; // Do nothing
          } 
          else if (duplicateStrategy === 'update') {
            const { error: updateErr } = await supabase
              .from('leads')
              .update(row)
              .eq('id', existing.id);
            if (updateErr) throw updateErr;
            successCount++;
          }
          else if (duplicateStrategy === 'create') {
            const { error: insertErr } = await supabase.from('leads').insert([row]);
            if (insertErr) throw insertErr;
            successCount++;
          }
        } else {
          // No duplicate found, standard insert
          const { error: insertErr } = await supabase.from('leads').insert([row]);
          if (insertErr) throw insertErr;
          successCount++;
        }
      } catch (rowErr: any) {
        failedCount++;
        errorLog.push({ row, error: rowErr.message });
      }
    }

    // 3. Finalize Import History
    await supabase
      .from('import_history')
      .update({
        success_count: successCount,
        failed_count: failedCount,
        duplicate_count: duplicateCount,
        status: 'completed',
        error_log: errorLog.length > 0 ? errorLog : null
      })
      .eq('id', historyRecord.id);

    return NextResponse.json({ 
      success: true, 
      results: { successCount, failedCount, duplicateCount } 
    });

  } catch (error: any) {
    console.error("Import API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}