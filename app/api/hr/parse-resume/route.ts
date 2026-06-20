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

export async function POST() {
  return NextResponse.json({
    success: false,
    message: "Resume parsing temporarily disabled",
  });
}