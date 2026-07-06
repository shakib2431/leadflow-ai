// import { NextResponse } from 'next/server';
// // @ts-ignore
// import pdfParse from 'pdf-parse'; 

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File;
//     if (!file) throw new Error("No file uploaded");

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     // Now pdfParse is imported safely
//     const data = await pdfParse(buffer);
//     return NextResponse.json({ text: data.text });
//   } catch (error) {
//     return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
//   }
// }



// import { NextResponse } from "next/server";
// // @ts-ignore
// import * as pdfParse from "pdf-parse";

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       throw new Error("No file uploaded");
//     }

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const data = await pdfParse(buffer);

//     return NextResponse.json({
//       text: data.text,
//     });
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       { error: "Parsing failed" },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import { parseResumeText, mapParsedToEmployee } from "@/lib/hrms/parseResume";

async function extractTextFromFile(file: File) {
  // Try to use pdf-parse if available, otherwise try to read as text
  try {
    // dynamic import to avoid build-time errors if package missing
    // @ts-ignore
    const pdfParse = await import('pdf-parse');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // @ts-ignore
    const data = await pdfParse.default(buffer);
    return data.text || '';
  } catch (err) {
    try {
      const text = await file.text();
      return text;
    } catch (err2) {
      return '';
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await extractTextFromFile(file);
    if (!text) return NextResponse.json({ error: 'Could not extract text from file' }, { status: 500 });

    const parsed = parseResumeText(text);
    const mapped = mapParsedToEmployee(parsed);
    return NextResponse.json({ success: true, parsed, mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Parsing failed' }, { status: 500 });
  }
}