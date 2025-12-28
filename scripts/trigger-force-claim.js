const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from the root realmkin directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const CRON_SECRET_TOKEN = process.env.CRON_SECRET_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/force-claim`;

async function triggerForceClaim() {
  console.log("⚡ Triggering FORCE claim (bypassing weekly cadence)...");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log("⚠️  WARNING: This will claim rewards regardless of weekly cadence!");

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
    console.error("❌ Failed to trigger force-claim:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

triggerForceClaim();
