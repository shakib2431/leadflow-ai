import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    let query = supabase.from('leads').select('id, full_name, email, phone, status, source, created_at, ai_score');

    if (filter === 'hot') query = query.gte('ai_score', 70);
    if (filter === 'pipeline') query = query.not('status', 'eq', 'lost');

    const { data: leads, error } = await query;
    if (error) throw error;

    if (!leads || leads.length === 0) {
      return new NextResponse("No data found to export.", { status: 404 });
    }

    // Convert to CSV
    const headers = Object.keys(leads[0]).join(",");
    const rows = leads.map(lead => {
      return Object.values(lead).map(value => {
        // Escape quotes and wrap strings in quotes to prevent comma breaks
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value === null ? "" : value;
      }).join(",");
    });

    const csvData = [headers, ...rows].join("\n");

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leadflow_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("Export API Error:", error);
    return new NextResponse("Failed to export data: " + error.message, { status: 500 });
  }
}