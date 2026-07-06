import { jsPDF } from 'jspdf';

type TokenMap = Record<string, string>;

const TOKEN_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function renderTemplate(template: string, tokens: TokenMap) {
  return template.replace(TOKEN_REGEX, (_, key: string) => tokens[key] ?? '');
}

export function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120);
}

export function formatCurrency(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Compensation details will be shared separately';
  return `Rs ${numeric.toLocaleString('en-IN')}`;
}

export function formatDate(value: unknown) {
  if (!value) return 'TBD';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB');
}

export function buildLetterTokens(input: {
  employee: Record<string, any>;
  departmentName: string;
  designationName: string;
}) {
  const { employee, departmentName, designationName } = input;
  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email || 'Employee';

  return {
    employee_name: fullName,
    first_name: String(employee.first_name || ''),
    last_name: String(employee.last_name || ''),
    employee_code: String(employee.employee_code || ''),
    email: String(employee.email || ''),
    phone: String(employee.phone || employee.mobile || ''),
    designation: designationName,
    department: departmentName,
    joining_date: formatDate(employee.joining_date || employee.date_of_joining),
    salary: formatCurrency(employee.salary),
    company_name: 'LeadFlow AI',
    current_date: formatDate(new Date().toISOString()),
  };
}

export function generateLetterPdf(input: {
  title: string;
  subject: string;
  body: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const lineHeight = 18;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();

  let cursorY = margin;

  const ensureSpace = (linesNeeded: number) => {
    if (cursorY + linesNeeded * lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const writeBlock = (text: string, fontSize = 12, gap = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text || '', maxWidth) as string[];
    ensureSpace(Math.max(1, lines.length));
    for (const line of lines) {
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
      ensureSpace(1);
    }
    cursorY += gap;
  };

  writeBlock(input.title, 20, 12);
  writeBlock(`Subject: ${input.subject}`, 12, 14);

  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    writeBlock(paragraph, 11, 8);
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}