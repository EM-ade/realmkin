const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from the root realmkin directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const CRON_SECRET_TOKEN = process.env.CRON_SECRET_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/auto-claim`;

async function triggerAutoClaim() {
  console.log("🚀 Triggering manual auto-claim...");
  console.log(`📡 Endpoint: ${ENDPOINT}`);

  if (!CRON_SECRET_TOKEN) {
    console.error("❌ Error: CRON_SECRET_TOKEN not found in .env");
    process.exit(1);
  }

  try {
    const response = await axios.post(
      ENDPOINT,
      {},
      {
        headers: {
          Authorization: `Bearer ${CRON_SECRET_TOKEN}`,
        },
      }
    );

    console.log("✅ Success!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Failed to trigger auto-claim:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

triggerAutoClaim();
