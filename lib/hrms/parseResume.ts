export function parseResumeText(text: string) {
  const result: any = {};

  // Email
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) result.email = emailMatch[0];

  // Phone (simple international/local matcher)
  const phoneMatch = text.match(/(\+\d{1,3}[\s-]?)?(?:\(\d+\)[\s-]?)?(?:\d[\s-]?){6,14}\d/);
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  // Lines for heuristics
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Assume first non-empty line is candidate's name if it contains letters and spaces and not an email/phone
  if (lines.length > 0) {
    const first = lines[0];
    if (!first.match(/[@\d]/)) {
      const parts = first.split(' ');
      result.first_name = parts[0];
      if (parts.length > 1) result.last_name = parts.slice(1).join(' ');
    }
  }

  // Title: look for lines that look like job titles (Title Case, contains keywords)
  const titleKeywords = ['Engineer','Developer','Manager','Designer','Director','Analyst','Consultant','Lead','Principal','Architect','Product'];
  for (const ln of lines.slice(0,6)) {
    for (const kw of titleKeywords) {
      if (new RegExp(`\\b${kw}\\b`,`i`).test(ln) && ln.length < 60) {
        result.title = ln;
        break;
      }
    }
    if (result.title) break;
  }

  // Experience years: look for 'years' mentions
  const expMatch = text.match(/(\d+)\+?\s+(?:years|yrs)\b/i);
  if (expMatch) result.experience_years = Number(expMatch[1]);

  // Skills: collect common skill tokens line that starts with 'Skills' or 'Technical'
  const skillsLine = lines.find(l => /^(skills|technical skills|technologies)/i.test(l));
  if (skillsLine) {
    const parts = skillsLine.split(/:|-|\u2013/).slice(1).join(' ');
    result.skills = parts.split(/,|;/).map(s=>s.trim()).filter(Boolean);
  }

  return result;
}

export function mapParsedToEmployee(parsed: any) {
  const emp: any = {};

  const normalizeEmail = (e: any) => {
    if (!e) return null;
    const s = String(e).trim();
    return /@/.test(s) ? s.toLowerCase() : null;
  };

  const normalizePhone = (p: any) => {
    if (!p) return null;
    const s = String(p).replace(/[^+0-9]/g, '');
    return s.length >= 7 ? s : null;
  };

  emp.first_name = parsed.first_name || parsed.name?.split?.(' ')?.[0] || null;
  emp.last_name = parsed.last_name || (parsed.name ? parsed.name.split(' ').slice(1).join(' ') : null) || null;
  emp.email = normalizeEmail(parsed.email || parsed.contact_email);
  emp.phone = normalizePhone(parsed.phone || parsed.mobile);
  emp.current_title = parsed.title || parsed.current_title || null;
  emp.experience_years = parsed.experience_years ? Number(parsed.experience_years) : null;
  emp.skills = Array.isArray(parsed.skills) ? parsed.skills : (parsed.skills ? String(parsed.skills).split(/,|;/).map(s=>s.trim()).filter(Boolean) : []);

  // Fallback sensible defaults for contactable fields
  if (!emp.email) emp.email = null;
  if (!emp.phone) emp.phone = null;

  return emp;
}
