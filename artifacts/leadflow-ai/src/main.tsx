import { createRoot } from 'react-dom/client';

import App from './App';
import { installHrmsApiAdapter } from './lib/hrms-api-adapter';

import './index.css';

// Serve /api/hrms/v2/* from Supabase (no separate backend deployed).
installHrmsApiAdapter();

createRoot(document.getElementById('root')!).render(<App />);
