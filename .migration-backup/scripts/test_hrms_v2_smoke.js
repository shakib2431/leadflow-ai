const fetch = require('node-fetch');

const base = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('HRMS v2 smoke test against', base);

  // GET employees
  let res = await fetch(`${base}/api/hrms/v2/employees`);
  console.log('GET /employees', res.status);

  // POST create a test employee
  const payload = { first_name: 'Test', last_name: 'Employee', email: 'test+hrms@example.com' };
  res = await fetch(`${base}/api/hrms/v2/employees`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  console.log('POST /employees', res.status, created?.data?.[0]?.id);

  console.log('Smoke test complete. (You may want to remove test data manually)');
}

run().catch(err => { console.error(err); process.exit(1); });
