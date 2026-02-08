#!/usr/bin/env node
import { Client } from "ssh2";
import { loadEnvConfig } from "./env-loader.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const env = loadEnvConfig(projectRoot);

const config = {
  host: env.SFTP_HOST,
  port: 22,
  username: env.SFTP_USERNAME,
  password: env.SFTP_PASSWORD,
};

const remotePath = env.SFTP_REMOTE_PATH || "/srv/customer/sites/wheretoeat.ch";

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.exec(`cd ${remotePath} && ${command}`, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = "";
        stream.on("close", (code) => {
          conn.end();
          resolve({ output, code });
        });
        stream.on("data", (data) => {
          output += data.toString();
        });
        stream.stderr.on("data", (data) => {
          output += data.toString();
        });
      });
    });

    conn.on("error", reject);
    conn.connect(config);
  });
}

async function main() {
  try {
    console.log("Checking remote setup...\n");

    // Check files
    console.log("Files on server:");
    const { output: files } = await runCommand("ls -la");
    console.log(files);

    // Check .env
    console.log("\n.env contents:");
    const { output: envOut } = await runCommand("cat .env 2>/dev/null || echo 'No .env file'");
    console.log(envOut);

    // Update .env to production using local .env values
    console.log("\nUpdating .env to production...");
    const envContent = `DATABASE_URL=${env.DATABASE_URL}
SESSION_SECRET=${env.SESSION_SECRET}
ADMIN_EMAIL=${env.ADMIN_EMAIL}
ADMIN_PASSWORD=${env.ADMIN_PASSWORD}
NODE_ENV=production
PORT=5000
GOOGLE_PLACES_API_KEY=${env.GOOGLE_PLACES_API_KEY || ""}`;

    await runCommand(`cat > .env << 'ENVEOF'
${envContent}
ENVEOF`);

    console.log("✓ .env updated\n");

    // Verify
    const { output: newEnv } = await runCommand("cat .env");
    console.log("New .env:");
    console.log(newEnv);

    console.log("\n✓ Setup complete!");
    console.log("\nGo to Infomaniak dashboard and:");
    console.log("1. Set start command: node index.cjs");
    console.log("2. Restart the application");

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
