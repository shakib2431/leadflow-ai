import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    module: 'hrms-v2',
    timestamp: new Date().toISOString(),
  });
}
