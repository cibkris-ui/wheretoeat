#!/usr/bin/env node
import { Client } from "ssh2";

const config = {
  host: "57-105737.ssh.hosting-ik.com",
  port: 22,
  username: "JCZwdWRtTwD_wheretoeat",
  password: "@dfg-rts-lfrDD22",
};

const remotePath = "/srv/customer/sites/wheretoeat.ch";

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
