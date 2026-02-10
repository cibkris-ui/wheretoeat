#!/usr/bin/env node
import Client from "ssh2-sftp-client";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
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

async function installProductionDeps() {
  console.log("Installing production dependencies in deploy/...");
  // Copy package.json and package-lock.json to deploy
  fs.copyFileSync(
    path.join(localDeployPath, "package.json"),
    path.join(localDeployPath, "package.json")
  );
  const lockFile = path.join(projectRoot, "package-lock.json");
  if (fs.existsSync(lockFile)) {
    fs.copyFileSync(lockFile, path.join(localDeployPath, "package-lock.json"));
  }
  // Run npm install --production in deploy folder
  execSync("npm install --production --ignore-scripts", {
    cwd: localDeployPath,
    stdio: "inherit",
  });
  console.log("Production dependencies installed!\n");
}

let uploadCount = 0;

async function uploadDirectorySilent(sftp, localDir, remoteDir) {
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
      await uploadDirectorySilent(sftp, localPath, remoteDest);
    } else {
      uploadCount++;
      if (uploadCount % 100 === 0) {
        process.stdout.write(`  ${uploadCount} files uploaded...\r`);
      }
      await sftp.put(localPath, remoteDest);
    }
  }
}

async function deploy() {
  const sftp = new Client();

  try {
    // Install production deps locally in deploy/
    await installProductionDeps();

    console.log("Connecting to Infomaniak...");
    await sftp.connect(config);
    console.log("Connected!\n");

    // Clean remote directory (except uploads and .env)
    console.log("Cleaning remote directory...");
    const remoteFiles = await sftp.list(remotePath);
    for (const file of remoteFiles) {
      if (file.name !== "uploads" && file.name !== ".env") {
        const fullPath = `${remotePath}/${file.name}`;
        console.log(`  Removing: ${file.name}`);
        if (file.type === "d") {
          await sftp.rmdir(fullPath, true);
        } else {
          await sftp.delete(fullPath);
        }
      }
    }

    // Upload new files (including node_modules)
    console.log("\nUploading files...");
    uploadCount = 0;

    // Upload non-node_modules files with detailed logging
    const deployFiles = fs.readdirSync(localDeployPath);
    for (const file of deployFiles) {
      if (file === "node_modules") continue;
      const localPath = path.join(localDeployPath, file);
      const remoteDest = `${remotePath}/${file}`;
      const stat = fs.statSync(localPath);
      if (stat.isDirectory()) {
        try { await sftp.mkdir(remoteDest, true); } catch (e) {}
        await uploadDirectory(sftp, localPath, remoteDest);
      } else {
        console.log(`  Uploading: ${file}`);
        await sftp.put(localPath, remoteDest);
      }
    }

    // Upload node_modules
    const nodeModulesLocal = path.join(localDeployPath, "node_modules");
    if (fs.existsSync(nodeModulesLocal)) {
      console.log("\nUploading node_modules (this may take a few minutes)...");
      try { await sftp.mkdir(`${remotePath}/node_modules`, true); } catch (e) {}
      await uploadDirectorySilent(sftp, nodeModulesLocal, `${remotePath}/node_modules`);
      console.log(`  ${uploadCount} files uploaded.`);
    }

    // Create uploads directory if not exists
    try {
      await sftp.mkdir(`${remotePath}/uploads`, true);
    } catch (e) {
      // Already exists
    }

    console.log("\n✓ Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Go to Infomaniak dashboard");
    console.log("2. Restart the application");

  } catch (err) {
    console.error("Deployment failed:", err.message);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

deploy();
