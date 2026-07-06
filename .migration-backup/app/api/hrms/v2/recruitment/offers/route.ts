import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

/**
 * Generate and send offer letter to candidate
 */
async function handler(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    if (req.method === 'POST') {
      const { candidate_id, position, salary, joining_date, validity_days = 7 } = await req.json();

      if (!candidate_id || !position || !salary || !joining_date) {
        return NextResponse.json(
          { error: 'candidate_id, position, salary, joining_date required' },
          { status: 400 }
        );
      }

      // Get candidate details
      const { data: candidate, error: candError } = await supabaseAdmin
        .from('candidates')
        .select('id, first_name, last_name, email, phone')
        .eq('id', candidate_id)
        .single();

      if (candError) throw candError;

      // Generate offer letter
      const offerValidUntil = new Date(new Date().getTime() + validity_days * 24 * 60 * 60 * 1000);
      const offerContent = `
Offer Letter

Dear ${candidate.first_name} ${candidate.last_name},

We are pleased to extend an offer of employment for the position of ${position}.

Position Details:
- Position: ${position}
- Joining Date: ${joining_date}
- Annual Salary: ₹${salary}

This offer is valid until ${offerValidUntil.toLocaleDateString()}.

Please confirm your acceptance by replying to this email or signing the digital offer letter.

Best regards,
Human Resources Team
      `.trim();

      // Store offer in database
      const { data: offer, error: offerError } = await supabaseAdmin
        .from('candidate_offers')
        .insert({
          candidate_id,
          position,
          salary,
          joining_date,
          validity_until: offerValidUntil.toISOString(),
          status: 'sent',
          offer_content: offerContent,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (offerError) throw offerError;

      // Send offer letter email
      try {
        const offerLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/candidate-portal/offers/${offer.id}`;
        await sendNotificationEmail({
          event: 'offer_generated',
          recipient_email: candidate.email,
          recipient_name: candidate.first_name,
          subject: `Offer Letter - ${position}`,
          data: {
            candidate_name: candidate.first_name,
            designation: position,
            joining_date,
            salary,
            validity_until: offerValidUntil.toLocaleDateString(),
            offer_link: offerLink,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send offer letter email:', emailErr);
      }

      return NextResponse.json({ data: offer }, { status: 201 });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const candidateId = url.searchParams.get('candidate_id');
      const status = url.searchParams.get('status');

      let query = supabaseAdmin
        .from('candidate_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (candidateId) query = query.eq('candidate_id', candidateId);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    if (req.method === 'PUT') {
      const { id, status } = await req.json();

      if (!id || !status) {
        return NextResponse.json({ error: 'id and status required' }, { status: 400 });
      }

      const { data: offer, error } = await supabaseAdmin
        .from('candidate_offers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If offer is accepted, create pre-onboarding record
      if (status === 'accepted') {
        const { data: candidate } = await supabaseAdmin
          .from('candidates')
          .select('first_name, last_name, email, phone')
          .eq('id', offer.candidate_id)
          .single();

        if (candidate) {
          await supabaseAdmin.from('pre_onboarding_queue').insert({
            candidate_id: offer.candidate_id,
            status: 'pending',
            expected_joining_date: offer.joining_date,
            created_at: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({ data: offer }, { status: 200 });
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = rateLimitMiddleware('offer-letters')(handler);
export const POST = rateLimitMiddleware('offer-letters')(handler);
export const PUT = rateLimitMiddleware('offer-letters')(handler);
