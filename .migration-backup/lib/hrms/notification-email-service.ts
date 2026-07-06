import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailEvent = 
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_pending_approval'
  | 'payroll_ready'
  | 'onboarding_task_assigned'
  | 'offer_generated'
  | 'pre_onboarding_ready'
  | 'appointment_ready'
  | 'exit_initiated'
  | 'attendance_exception'
  | 'document_uploaded'
  | 'employee_login_credentials'
  | 'pre_onboarding_submitted_admin'
  | 'attendance_correction_requested';

export interface NotificationPayload {
  event: EmailEvent;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  data: Record<string, any>;
}

const emailTemplates: Record<EmailEvent, (data: Record<string, any>) => { subject: string; html: string }> = {
  leave_approved: (data) => ({
    subject: `Leave Approved: ${data.leave_type}`,
    html: `
      <h2>Your leave has been approved</h2>
      <p>Hi ${data.employee_name},</p>
      <p><strong>Leave Type:</strong> ${data.leave_type}</p>
      <p><strong>Duration:</strong> ${data.start_date} to ${data.end_date} (${data.days_count} days)</p>
      <p>Status: <strong style="color: #10b981;">APPROVED</strong></p>
      <p>Thank you!</p>
    `,
  }),
  leave_rejected: (data) => ({
    subject: `Leave Request Update: ${data.leave_type}`,
    html: `
      <h2>Your leave request has been rejected</h2>
      <p>Hi ${data.employee_name},</p>
      <p><strong>Leave Type:</strong> ${data.leave_type}</p>
      <p><strong>Duration:</strong> ${data.start_date} to ${data.end_date}</p>
      <p>Status: <strong style="color: #ef4444;">REJECTED</strong></p>
      <p>Please contact HR for more information.</p>
    `,
  }),
  leave_pending_approval: (data) => ({
    subject: `New Leave Request Awaiting Approval`,
    html: `
      <h2>New leave request pending approval</h2>
      <p>Hi ${data.approver_name},</p>
      <p><strong>Employee:</strong> ${data.employee_name}</p>
      <p><strong>Leave Type:</strong> ${data.leave_type}</p>
      <p><strong>Duration:</strong> ${data.start_date} to ${data.end_date} (${data.days_count} days)</p>
      <p><a href="${data.approval_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Request</a></p>
    `,
  }),
  payroll_ready: (data) => ({
    subject: `Payroll Processed: ${data.period}`,
    html: `
      <h2>Your payroll has been processed</h2>
      <p>Hi ${data.employee_name},</p>
      <p><strong>Period:</strong> ${data.period}</p>
      <p><strong>Net Pay:</strong> ₹${data.net_pay}</p>
      <p><a href="${data.payslip_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Download Payslip</a></p>
    `,
  }),
  onboarding_task_assigned: (data) => ({
    subject: `Onboarding Task: ${data.task}`,
    html: `
      <h2>New onboarding task assigned</h2>
      <p>Hi ${data.assigned_to},</p>
      <p><strong>New Employee:</strong> ${data.employee_name}</p>
      <p><strong>Task:</strong> ${data.task}</p>
      <p><strong>Due Date:</strong> ${data.due_date}</p>
      <p><a href="${data.task_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Complete Task</a></p>
    `,
  }),
  offer_generated: (data) => ({
    subject: `Your Offer Letter is Ready`,
    html: `
      <h2>Congratulations!</h2>
      <p>Hi ${data.candidate_name},</p>
      <p>Your offer letter has been generated and is ready for review.</p>
      <p><strong>Position:</strong> ${data.designation}</p>
      <p><strong>Joining Date:</strong> ${data.joining_date}</p>
      <p><a href="${data.offer_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Offer</a></p>
    `,
  }),
  pre_onboarding_ready: (data) => ({
    subject: `Pre-Onboarding Form Ready`,
    html: `
      <h2>Welcome to the next step</h2>
      <p>Hi ${data.employee_name},</p>
      <p>Your offer has been accepted and your pre-onboarding form is now ready.</p>
      <p>Please complete it using the secure link below:</p>
      <p><a href="${data.pre_onboarding_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Complete Pre-Onboarding</a></p>
      <p>If the button does not work, copy and open this link: <br /><a href="${data.pre_onboarding_link}">${data.pre_onboarding_link}</a></p>
    `,
  }),
  appointment_ready: (data) => ({
    subject: `Appointment Letter Ready`,
    html: `
      <h2>Your appointment letter is ready</h2>
      <p>Hi ${data.employee_name},</p>
      <p>Your appointment letter has been generated and is awaiting your digital signature.</p>
      <p><a href="${data.appointment_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Sign & Download</a></p>
    `,
  }),
  exit_initiated: (data) => ({
    subject: `Exit Process Initiated`,
    html: `
      <h2>Exit process initiated</h2>
      <p>Hi ${data.employee_name},</p>
      <p><strong>Last Working Day:</strong> ${data.last_working_day}</p>
      <p>Please complete the exit clearance checklist and return all company assets.</p>
      <p><a href="${data.exit_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Complete Clearance</a></p>
    `,
  }),
  attendance_exception: (data) => ({
    subject: `Attendance Exception: ${data.exception_type}`,
    html: `
      <h2>Attendance exception detected</h2>
      <p>Hi HR Team,</p>
      <p><strong>Employee:</strong> ${data.employee_name}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Exception:</strong> ${data.exception_type}</p>
      <p><a href="${data.resolution_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Resolve</a></p>
    `,
  }),
  document_uploaded: (data) => ({
    subject: `Document Uploaded: ${data.document_type}`,
    html: `
      <h2>Document uploaded</h2>
      <p>Hi ${data.approver_name},</p>
      <p><strong>Employee:</strong> ${data.employee_name}</p>
      <p><strong>Document:</strong> ${data.document_type}</p>
      <p><a href="${data.document_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Document</a></p>
    `,
  }),
  employee_login_credentials: (data) => ({
    subject: 'Welcome to LeadFlow AI HRMS - Your Login Credentials',
    html: `
      <h2>Welcome to LeadFlow AI HRMS</h2>
      <p>Hi ${data.employee_name},</p>
      <p>Your employee account has been created. Use the credentials below to sign in:</p>
      <p><strong>Email:</strong> ${data.employee_email}</p>
      <p><strong>Temporary Password:</strong> ${data.temporary_password}</p>
      <p><strong>Login URL:</strong> <a href="${data.login_link}">${data.login_link}</a></p>
      <p style="margin-top: 16px;">For security, you will be required to change your password at first login.</p>
      <p>If you did not expect this message, contact your HR team immediately.</p>
    `,
  }),
  pre_onboarding_submitted_admin: (data) => ({
    subject: `Pre-Onboarding Submitted: ${data.employee_name}`,
    html: `
      <h2>Pre-Onboarding form submitted</h2>
      <p><strong>Employee:</strong> ${data.employee_name}</p>
      <p><strong>Email:</strong> ${data.employee_email}</p>
      <p><strong>Documents uploaded:</strong> ${data.documents_count}</p>
      <p>Please review and verify details in HRMS before onboarding activation.</p>
      <p><a href="${data.review_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Open Pre-Onboarding Queue</a></p>
    `,
  }),
  attendance_correction_requested: (data) => ({
    subject: `Attendance Correction Request: ${data.employee_name}`,
    html: `
      <h2>New attendance correction request</h2>
      <p><strong>Employee:</strong> ${data.employee_name}</p>
      <p><strong>Email:</strong> ${data.employee_email}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Current Status:</strong> ${data.current_status}</p>
      <p><strong>Requested Status:</strong> ${data.requested_status}</p>
      <p><strong>Employee Note:</strong> ${data.reason}</p>
      <p><a href="${data.review_link}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Open Attendance Corrections</a></p>
    `,
  }),
};

export async function sendNotificationEmail(payload: NotificationPayload) {
  try {
    const template = emailTemplates[payload.event];
    if (!template) {
      console.error(`Unknown email event: ${payload.event}`);
      return { success: false, error: 'Unknown email event' };
    }

    const { subject, html } = template(payload.data);

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@leadflow.ai',
      to: payload.recipient_email,
      subject,
      html,
    });

    if (result.error) {
      console.error('Email send error:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, id: result.data?.id };
  } catch (error: any) {
    console.error('Notification email error:', error);
    return { success: false, error: error.message };
  }
}

// Batch send notifications
export async function sendBatchNotifications(payloads: NotificationPayload[]) {
  const results = await Promise.all(
    payloads.map((payload) => sendNotificationEmail(payload))
  );
  return results;
}
