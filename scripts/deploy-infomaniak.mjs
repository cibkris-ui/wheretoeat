#!/usr/bin/env node
import Client from "ssh2-sftp-client";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const config = {
  host: "57-105737.ssh.hosting-ik.com",
  port: 22,
  username: "JCZwdWRtTwD_wheretoeat",
  password: "@dfg-rts-lfrDD22",
};

const remotePath = "/srv/customer/sites/wheretoeat.ch";
const localDeployPath = path.join(projectRoot, "deploy");

async function uploadDirectory(sftp, localDir, remoteDir) {
  const files = fs.readdirSync(localDir);

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remoteDest = `${remoteDir}/${file}`;
    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
      try {
        await sftp.mkdir(remoteDest, true);
      } catch (e) {
        // Directory might exist
      }
      await uploadDirectory(sftp, localPath, remoteDest);
    } else {
      console.log(`  Uploading: ${file}`);
      await sftp.put(localPath, remoteDest);
    }
  }
}

async function deploy() {
  const sftp = new Client();

  try {
    console.log("Connecting to Infomaniak...");
    await sftp.connect(config);
    console.log("Connected!\n");

    // Clean remote directory (except node_modules and uploads)
    console.log("Cleaning remote directory...");
    const remoteFiles = await sftp.list(remotePath);
    for (const file of remoteFiles) {
      if (file.name !== "node_modules" && file.name !== "uploads" && file.name !== ".env") {
        const fullPath = `${remotePath}/${file.name}`;
        console.log(`  Removing: ${file.name}`);
        if (file.type === "d") {
          await sftp.rmdir(fullPath, true);
        } else {
          await sftp.delete(fullPath);
        }
      }
    }

    // Upload new files
    console.log("\nUploading new files...");
    await uploadDirectory(sftp, localDeployPath, remotePath);

    // Create uploads directory if not exists
    try {
      await sftp.mkdir(`${remotePath}/uploads`, true);
    } catch (e) {
      // Already exists
    }

    console.log("\n✓ Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Go to Infomaniak dashboard");
    console.log("2. Run: npm install --production");
    console.log("3. Set start command: node index.cjs");
    console.log("4. Restart the application");

  } catch (err) {
    console.error("Deployment failed:", err.message);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

deploy();
