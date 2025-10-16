import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = resolve(__dirname, '../config/allowed-namespaces.json');
const { allowed, infrastructure } = JSON.parse(readFileSync(configPath, 'utf-8'));
const prefixes = new Set([...allowed, ...infrastructure]);

// Expected mounted routes from our boot.ts
const mounted = [
  '/api/ops',
  '/api/audit', 
  '/api/health',
  '/api/twilio',
  '/api/auth',
  '/api/lenders',
  '/api/marketing',
  '/api/applications', 
  '/api/contacts',
  '/api/pipeline',
  '/api/lender-products',
  '/api/comm/email',
  '/api/comm/calls',
  '/api/tasks', 
  '/api/calendar',
  '/api/reports'
];

const offenders = mounted.filter(p => ![...prefixes].some(ok => p.startsWith(ok)));

if (offenders.length) {
  console.error('❌ Disallowed namespace mounts detected:\n', offenders);
  process.exit(1);
} else {
  console.log('Namespaces valid ✅');
}