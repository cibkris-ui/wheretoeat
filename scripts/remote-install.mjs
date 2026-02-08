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
      console.log(`Running: ${command}\n`);
      conn.exec(`cd ${remotePath} && ${command}`, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = "";
        stream.on("close", (code) => {
          conn.end();
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}`));
          }
        });
        stream.on("data", (data) => {
          const text = data.toString();
          output += text;
          process.stdout.write(text);
        });
        stream.stderr.on("data", (data) => {
          process.stderr.write(data.toString());
        });
      });
    });

    conn.on("error", reject);
    conn.connect(config);
  });
}

async function main() {
  try {
    console.log("Connecting to Infomaniak...\n");

    // Install production dependencies
    await runCommand("npm install --production --legacy-peer-deps");

    console.log("\n✓ Dependencies installed!");
    console.log("\nNow restart the app in Infomaniak dashboard.");
    console.log("Start command should be: node index.cjs");

  } catch (err) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
}

main();
