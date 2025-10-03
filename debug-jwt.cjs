const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Test token from environment variable or command line argument
const token = process.env.TEST_JWT_TOKEN || process.argv[2];

if (!token) {
  console.log("❌ No JWT token provided. Usage:");
  console.log("   Environment: TEST_JWT_TOKEN=your_token node debug-jwt.cjs");
  console.log("   Command line: node debug-jwt.cjs your_token");
  process.exit(1);
}

console.log("JWT_SECRET:", JWT_SECRET);
console.log("Token:", token);

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log("✅ Token verified successfully:");
  console.log(decoded);
} catch (error) {
  console.log("❌ Token verification failed:");
  console.log(error.message);
  
  // Try decoding without verification to see payload
  const decoded = jwt.decode(token);
  console.log("Decoded payload:", decoded);
}