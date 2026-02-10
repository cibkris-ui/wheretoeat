#!/usr/bin/env node
import Client from "ssh2-sftp-client";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "./env-loader.mjs";

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

async function fix() {
  const sftp = new Client();
  try {
    console.log("Connecting...");
    await sftp.connect(config);

    // Upload fixed index.cjs
    console.log("Uploading index.cjs...");
    await sftp.put(path.join(projectRoot, "deploy", "index.cjs"), `${remotePath}/index.cjs`);
    console.log("Uploading index.cjs.map...");
    await sftp.put(path.join(projectRoot, "deploy", "index.cjs.map"), `${remotePath}/index.cjs.map`);

    // Append RESEND_API_KEY to remote .env if not already there
    console.log("Updating remote .env...");
    const remoteEnvPath = `${remotePath}/.env`;
    let remoteEnv = "";
    try {
      const buf = await sftp.get(remoteEnvPath);
      remoteEnv = buf.toString();
    } catch (e) {
      console.log("No .env found on server, will create one");
    }

    if (!remoteEnv.includes("RESEND_API_KEY")) {
      const newLine = remoteEnv.endsWith("\n") ? "" : "\n";
      remoteEnv += `${newLine}RESEND_API_KEY=${env.RESEND_API_KEY}\n`;
      await sftp.put(Buffer.from(remoteEnv), remoteEnvPath);
      console.log("RESEND_API_KEY added to remote .env");
    } else {
      console.log("RESEND_API_KEY already exists in remote .env");
    }

    console.log("\nDone! Restart the app on Infomaniak.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await sftp.end();
  }
}

fix();
