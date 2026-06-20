import { NextResponse } from 'next/server';
// @ts-ignore
import pdfParse from 'pdf-parse'; 

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Now pdfParse is imported safely
    const data = await pdfParse(buffer);
    return NextResponse.json({ text: data.text });
  } catch (error) {
    return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
  }
}