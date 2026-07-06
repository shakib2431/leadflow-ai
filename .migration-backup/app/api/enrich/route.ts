import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Invalid email provided" }, { status: 400 });
    }

    const domain = email.split('@')[1];
    const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

    // Simulate network delay for scraping/API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // MOCK ENRICHMENT DATA
    // TODO: Replace this block with an actual fetch() to Clearbit/Apollo API later
    const enrichedData = {
      person: {
        job_title: "Director of Operations",
        linkedin_url: `https://linkedin.com/in/${email.split('@')[0]}`,
        social_handles: { twitter: `@${email.split('@')[0]}` }
      },
      company: {
        name: companyName,
        domain: domain,
        logo: `https://logo.clearbit.com/${domain}`, // Clearbit's free logo API
        industry: "Enterprise Software",
        employee_count: "50-200",
        revenue_range: "$10M - $50M",
        tech_stack: ["React", "Postgres", "Vercel", "Stripe"],
        recent_news: `${companyName} announces new AI initiative for Q3.`
      }
    };

    return NextResponse.json({ success: true, data: enrichedData });

  } catch (error) {
    return NextResponse.json({ error: "Failed to enrich contact" }, { status: 500 });
  }
}