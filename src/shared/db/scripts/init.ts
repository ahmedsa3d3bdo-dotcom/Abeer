import { checkDatabaseConnection, closeDatabaseConnection } from "../index";
import * as dotenv from "dotenv";

dotenv.config();

async function init() {
  console.log("🔄 Testing database connection...");

  const isConnected = await checkDatabaseConnection();

  if (isConnected) {
    console.log("✅ Database connection successful!");
    console.log(`📊 Connected to: ${process.env.DB_NAME }`);
  } else {
    console.error("❌ Database connection failed!");
    process.exit(1);
  }

  await closeDatabaseConnection();
}

init()
  .then(() => {
    console.log("✅ Initialization complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });
