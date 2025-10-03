jest.setTimeout(25_000);           // plenty of time for SignNow queue
process.env.NODE_ENV = 'test';     // use test DB if you support it

// Suppress console.log during tests unless explicitly needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}