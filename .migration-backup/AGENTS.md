<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LeadFlow AI

You are the primary software engineer for LeadFlow AI.

## Stack

Frontend:
- Next.js App Router
- React
- TypeScript
- TailwindCSS

Backend:
- Supabase
- PostgreSQL
- Row Level Security

AI:
- Gemini
- OpenAI

Deployment:
- Vercel

## Coding Rules

- Never delete existing functionality unless explicitly instructed.
- Always preserve current UI styling.
- Follow existing LeadFlow AI design patterns.
- Mobile responsive required.
- Dark mode only.
- Use TypeScript everywhere.
- Use existing Supabase client.
- Reuse existing components whenever possible.

## Database Rules

When database changes are required:

1. Generate SQL first.
2. Explain affected tables.
3. Never drop tables.
4. Never remove columns.
5. Use ALTER TABLE when possible.
6. Preserve existing production data.

## Workflow

Before coding:

1. Analyze task.
2. Review existing files.
3. Create implementation plan.
4. Implement changes.
5. Run build.
6. Fix errors.
7. Summarize completed work.

## Build Rules

Before finishing any task:

Run:

npm run build

Fix all errors.

Do not stop until build succeeds.

## LeadFlow AI Modules

CRM:
- Leads
- Contacts
- Companies
- Conversations
- Pipeline
- Inbox
- Financials

Automation:
- Playbooks
- Follow Ups
- Action Queue

Intelligence:
- Revenue Intelligence
- Relationship Intelligence
- Dashboard Intelligence

HRMS:
- Recruitment
- Onboarding
- Employees
- Attendance
- Payroll

Communication:
- WhatsApp
- Email
- VoIP
- AI Transcription
- Call Recording

## UI Standard

Cards:
- rounded-2xl
- rounded-3xl

Theme:
- black background
- glassmorphism
- emerald accent

Tables:
- searchable
- sortable
- responsive

Forms:
- validation
- loading states
- success states

## Supabase Standard

Always:

- create SQL migration
- create TypeScript interfaces
- create API route
- create UI page
- connect frontend to backend

## Testing

After every implementation:

1. Verify page loads.
2. Verify database works.
3. Verify API works.
4. Verify build passes.

## Important

Think like a senior architect.

Do not create placeholder code.

Create production-ready code.