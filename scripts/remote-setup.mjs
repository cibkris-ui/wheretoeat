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
    const { output: env } = await runCommand("cat .env 2>/dev/null || echo 'No .env file'");
    console.log(env);

    // Update .env to production
    console.log("\nUpdating .env to production...");
    const envContent = `DATABASE_URL=postgresql://postgres:FGEasfgLJFFwsdgg@database-w2eat.cpoqmisom0js.eu-north-1.rds.amazonaws.com:5432/postgres
SESSION_SECRET=w2eat-session-secret-k8f3m9x2p7
ADMIN_EMAIL=hello@wheretoeat.ch
ADMIN_PASSWORD=@dfg-rts-lfr-Q#§76
NODE_ENV=production
PORT=5000
GOOGLE_PLACES_API_KEY=`;

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
