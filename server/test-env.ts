import dotenv from "dotenv";
dotenv.config();

console.log("🧪 Boreal Staff App — Environment Sanity Check\n");

const keys = [
  "PORT",
  "NODE_ENV",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
];

for (const key of keys) {
  const value = process.env[key];
  if (!value) {
    console.log(`❌ ${key} is MISSING`);
  } else {
    const masked =
      value.length > 6
        ? value.substring(0, 3) + "***" + value.substring(value.length - 3)
        : "***";
    console.log(`✅ ${key} = ${masked}`);
  }
}

console.log("\nDone. If any ❌ appear, check GitHub Secrets or .env file.");
