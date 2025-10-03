// Load dev helpers only in dev. No sockets in prod builds.
if (import.meta.env.DEV) {
  // Lazy import so it never lands in prod bundle
  import('eruda').then(m => m.default.init());
}