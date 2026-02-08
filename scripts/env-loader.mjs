import fs from "fs";
import path from "path";

export function loadEnvConfig(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  const env = { ...process.env };

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    }
  }

  // Validate required SFTP vars
  const required = ["SFTP_HOST", "SFTP_USERNAME", "SFTP_PASSWORD"];
  const missing = required.filter(k => !env[k]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    console.error("Add them to your .env file.");
    process.exit(1);
  }

  return env;
}
