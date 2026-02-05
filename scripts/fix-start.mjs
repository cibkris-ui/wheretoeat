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
          process.stdout.write(data.toString());
        });
        stream.stderr.on("data", (data) => {
          output += data.toString();
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
    console.log("Fixing package.json start script...\n");

    // Update package.json to use index.cjs directly (not dist/index.cjs)
    await runCommand(`sed -i 's|node dist/index.cjs|node index.cjs|g' package.json`);

    console.log("\nVerifying package.json:");
    await runCommand("grep start package.json");

    console.log("\n✓ Fixed! Now restart the app in Infomaniak dashboard.");

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
