'use client';

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import HRMSSidebarNav from '@/components/hrms/hrms-sidebar-nav';
import HRMSTopHeader from '@/components/hrms/hrms-top-header';

export default function HRMSSetupPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState('Setting up HRMS access...');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          setStatus('Error: No session found. Please log in first.');
          return;
        }

        const res = await fetch('/api/hrms/v2/auth/setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        if (res.ok) {
          setStatus(`✓ Success! ${data.message}`);
          setSuccess(true);
          setTimeout(() => navigate('/hrms/v2'), 2000);
        } else {
          setStatus(`Error: ${data.error || 'Setup failed'}`);
        }
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
      }
    }

    setup();
  }, []);

  return (
    <div className="hrms-enterprise flex min-h-screen items-center justify-center p-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="HRMS Setup"
          subtitle="Initializing secure HRMS access and workspace role context."
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)]">
          <p className={`text-lg ${success ? 'text-emerald-600' : 'text-slate-600'}`}>{status}</p>
          {success && <p className="mt-4 text-sm text-slate-500">Redirecting to HRMS v2...</p>}
        </section>
      </div>
    </div>
  );
}
