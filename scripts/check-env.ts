import "dotenv/config";

function checkEnv() {
  console.log("🔍 Environment Check:");
  console.log("-----------------------");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("DATABASE_URL_PROD:", process.env.DATABASE_URL_PROD || "(not set)");
  console.log("AWS_S3_BUCKET_NAME:", process.env.AWS_S3_BUCKET_NAME);
  console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID);
  console.log("-----------------------");
}

checkEnv();
