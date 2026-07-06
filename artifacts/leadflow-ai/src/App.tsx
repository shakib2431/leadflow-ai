import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { NotificationProvider } from '@/lib/notification-context';
import { CommandPalette } from '@/components/command-palette';

// Pages
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ActionQueue from '@/pages/ActionQueue';
import Analytics from '@/pages/Analytics';
import Automations from '@/pages/Automations';
import CandidatePortalOffer from '@/pages/CandidatePortalOffer';
import ClientPortal from '@/pages/ClientPortal';
import Communication from '@/pages/Communication';
import Companies from '@/pages/Companies';
import CompanyDetail from '@/pages/CompanyDetail';
import Contacts from '@/pages/Contacts';
import ContactDetail from '@/pages/ContactDetail';
import Conversations from '@/pages/Conversations';
import Export from '@/pages/Export';
import Financials from '@/pages/Financials';
import HRMSAdminDashboard from '@/pages/HRMSAdminDashboard';
import HRMSAdmin from '@/pages/HRMSAdmin';
import HRMSAlumni from '@/pages/HRMSAlumni';
import HRMSAudit from '@/pages/HRMSAudit';
import HRMSClearance from '@/pages/HRMSClearance';
import HRMSEmployeeDetail from '@/pages/HRMSEmployeeDetail';
import HRMSFullFinal from '@/pages/HRMSFullFinal';
import HRMSOrganization from '@/pages/HRMSOrganization';
import HRMSv2 from '@/pages/HRMSv2';
import HRMSReports from '@/pages/HRMSReports';
import HRMSReportsAttendance from '@/pages/HRMSReportsAttendance';
import HRMSReportsCompliance from '@/pages/HRMSReportsCompliance';
import HRMSReportsCustom from '@/pages/HRMSReportsCustom';
import HRMSReportsLeave from '@/pages/HRMSReportsLeave';
import HRMSReportsPayroll from '@/pages/HRMSReportsPayroll';
import HRMSReportsRecruitment from '@/pages/HRMSReportsRecruitment';
import HRMSReportsWorkforce from '@/pages/HRMSReportsWorkforce';
import HRMSRoles from '@/pages/HRMSRoles';
import HRMSSelfService from '@/pages/HRMSSelfService';
import HRMSSelfServiceTab from '@/pages/HRMSSelfServiceTab';
import HRMSOfferAcceptance from '@/pages/HRMSOfferAcceptance';
import HRMSSeparation from '@/pages/HRMSSeparation';
import HRMSSettings from '@/pages/HRMSSettings';
import HRMSSetup from '@/pages/HRMSSetup';
import HRMSTemplates from '@/pages/HRMSTemplates';
import Import from '@/pages/Import';
import Inbox from '@/pages/Inbox';
import LeadDetail from '@/pages/LeadDetail';
import Leads from '@/pages/Leads';
import Onboarding from '@/pages/Onboarding';
import Pipeline from '@/pages/Pipeline';
import PlaybooksEnroll from '@/pages/PlaybooksEnroll';
import Playbooks from '@/pages/Playbooks';
import PreOnboarding from '@/pages/PreOnboarding';
import Revenue from '@/pages/Revenue';
import Roadmap from '@/pages/Roadmap';
import Settings from '@/pages/Settings';
import Setup from '@/pages/Setup';
import TeamAttendanceExceptions from '@/pages/TeamAttendanceExceptions';
import TeamAttendance from '@/pages/TeamAttendance';
import TeamEmployeeDetail from '@/pages/TeamEmployeeDetail';
import TeamEmployees from '@/pages/TeamEmployees';
import TeamExit from '@/pages/TeamExit';
import TeamLeave from '@/pages/TeamLeave';
import TeamOfferManagement from '@/pages/TeamOfferManagement';
import TeamOnboardingEmployee from '@/pages/TeamOnboardingEmployee';
import TeamOnboarding from '@/pages/TeamOnboarding';
import Team from '@/pages/Team';
import TeamPayroll from '@/pages/TeamPayroll';
import TeamPreOnboarding from '@/pages/TeamPreOnboarding';
import TeamRecruitment from '@/pages/TeamRecruitment';
import Todos from '@/pages/Todos';
import Triage from '@/pages/Triage';
import WorkspaceDetail from '@/pages/WorkspaceDetail';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/login/forgot-password" component={ForgotPassword} />
      <Route path="/login/reset-password" component={ResetPassword} />
      <Route path="/action-queue" component={ActionQueue} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/automations" component={Automations} />
      <Route path="/candidate-portal/offers/:offerId" component={CandidatePortalOffer} />
      <Route path="/client/:token" component={ClientPortal} />
      <Route path="/communication" component={Communication} />
      <Route path="/companies/:id" component={CompanyDetail} />
      <Route path="/companies" component={Companies} />
      <Route path="/contacts/:id" component={ContactDetail} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/export" component={Export} />
      <Route path="/financials" component={Financials} />
      <Route path="/hrms/v2/admin-dashboard" component={HRMSAdminDashboard} />
      <Route path="/hrms/v2/admin" component={HRMSAdmin} />
      <Route path="/hrms/v2/alumni" component={HRMSAlumni} />
      <Route path="/hrms/v2/audit" component={HRMSAudit} />
      <Route path="/hrms/v2/clearance" component={HRMSClearance} />
      <Route path="/hrms/v2/employees/:id" component={HRMSEmployeeDetail} />
      <Route path="/hrms/v2/full-and-final" component={HRMSFullFinal} />
      <Route path="/hrms/v2/organization" component={HRMSOrganization} />
      <Route path="/hrms/v2/reports/attendance" component={HRMSReportsAttendance} />
      <Route path="/hrms/v2/reports/compliance" component={HRMSReportsCompliance} />
      <Route path="/hrms/v2/reports/custom" component={HRMSReportsCustom} />
      <Route path="/hrms/v2/reports/leave" component={HRMSReportsLeave} />
      <Route path="/hrms/v2/reports/payroll" component={HRMSReportsPayroll} />
      <Route path="/hrms/v2/reports/recruitment" component={HRMSReportsRecruitment} />
      <Route path="/hrms/v2/reports/workforce" component={HRMSReportsWorkforce} />
      <Route path="/hrms/v2/reports" component={HRMSReports} />
      <Route path="/hrms/v2/roles" component={HRMSRoles} />
      <Route path="/hrms/v2/self-service/offer-acceptance" component={HRMSOfferAcceptance} />
      <Route path="/hrms/v2/self-service/:tab" component={HRMSSelfServiceTab} />
      <Route path="/hrms/v2/self-service" component={HRMSSelfService} />
      <Route path="/hrms/v2/separation" component={HRMSSeparation} />
      <Route path="/hrms/v2/settings" component={HRMSSettings} />
      <Route path="/hrms/v2/setup" component={HRMSSetup} />
      <Route path="/hrms/v2/templates" component={HRMSTemplates} />
      <Route path="/hrms/v2" component={HRMSv2} />
      <Route path="/import" component={Import} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/leads" component={Leads} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/playbooks/enroll" component={PlaybooksEnroll} />
      <Route path="/playbooks" component={Playbooks} />
      <Route path="/pre-onboarding/:token" component={PreOnboarding} />
      <Route path="/revenue" component={Revenue} />
      <Route path="/roadmap" component={Roadmap} />
      <Route path="/settings" component={Settings} />
      <Route path="/setup" component={Setup} />
      <Route path="/team/attendance-exceptions" component={TeamAttendanceExceptions} />
      <Route path="/team/attendance" component={TeamAttendance} />
      <Route path="/team/employees/:id" component={TeamEmployeeDetail} />
      <Route path="/team/employees" component={TeamEmployees} />
      <Route path="/team/exit" component={TeamExit} />
      <Route path="/team/leave" component={TeamLeave} />
      <Route path="/team/offer-management" component={TeamOfferManagement} />
      <Route path="/team/onboarding/:employeeId" component={TeamOnboardingEmployee} />
      <Route path="/team/onboarding" component={TeamOnboarding} />
      <Route path="/team/payroll" component={TeamPayroll} />
      <Route path="/team/pre-onboarding" component={TeamPreOnboarding} />
      <Route path="/team/recruitment" component={TeamRecruitment} />
      <Route path="/team/:id" component={TeamEmployeeDetail} />
      <Route path="/team" component={Team} />
      <Route path="/todos" component={Todos} />
      <Route path="/triage" component={Triage} />
      <Route path="/workspace/:id" component={WorkspaceDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <CommandPalette />
            <Router />
          </WouterRouter>
        </NotificationProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
