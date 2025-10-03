const PROD = process.env.NODE_ENV === 'production';
const missing = [];
if (PROD) {
  for (const key of ['SIGNNOW_API_KEY','CLIENT_SYNC_SECRET']) {
    if (!process.env[key]) missing.push(key);
  }
}
if (missing.length) {
  throw new Error(`ASK: Missing required production secrets: ${missing.join(', ')}`);
}
export {};