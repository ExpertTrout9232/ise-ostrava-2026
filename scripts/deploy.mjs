/*
Production deployment script.

Builds the site, clears the remote directory over SFTP, and uploads src/.
Run via: npm run deploy
Force-sync local repo from origin before deploy: npm run deploy -- --force-pull

Required variables in .env (see .env.example):
SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH

Optional:
SFTP_PORT (default: 22)

CLI flags:
--force-pull  Hard-resets the current local branch to origin/<branch> and removes untracked files before deployment.
*/

import "dotenv/config";
import SftpClient from "ssh2-sftp-client";
import { execFile } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = resolve(ROOT_DIR, "src");
const execFileAsync = promisify(execFile);
const FORCE_PULL_FLAG = "--force-pull";
const FORCE_PULL = process.argv.includes(FORCE_PULL_FLAG);

function step(n, total, message) {
  console.log(`\n  [${n}/${total}] ${message}`);
}

function info(message) {
  console.log(`         ${message}`);
}

function abort(message, hint) {
  console.error(`\n  ERROR  ${message}`);
  if (hint) console.error(`         ${hint}`);
  console.error("");
  process.exit(1);
}

async function forcePullFromOrigin() {
  info("Fetching latest refs from origin.");
  await execFileAsync("git", ["fetch", "origin", "--prune"], { cwd: ROOT_DIR });

  const { stdout: branchStdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: ROOT_DIR,
  });
  const branch = branchStdout.trim();

  if (!branch || branch === "HEAD") {
    throw new Error("Cannot use --force-pull in detached HEAD state.");
  }

  info(`Resetting local branch to origin/${branch}.`);
  await execFileAsync("git", ["reset", "--hard", `origin/${branch}`], { cwd: ROOT_DIR });

  info("Removing untracked files and directories.");
  await execFileAsync("git", ["clean", "-fd"], { cwd: ROOT_DIR });
}

const REQUIRED_VARS = ["SFTP_HOST", "SFTP_USER", "SFTP_PASSWORD", "SFTP_REMOTE_PATH"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  abort(
    `Missing required variable${missing.length > 1 ? "s" : ""} in .env: ${missing.join(", ")}`,
    "Copy .env.example to .env and fill in all required values.",
  );
}

const { SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH } = process.env;
const SFTP_PORT = parseInt(process.env.SFTP_PORT ?? "22", 10);

if (!Number.isInteger(SFTP_PORT) || SFTP_PORT < 1 || SFTP_PORT > 65535) {
  abort(`SFTP_PORT must be a valid port number (1-65535), got: "${process.env.SFTP_PORT}"`);
}

async function ensureRemoteDir(sftp, remotePath) {
  const stat = await sftp.exists(remotePath);
  if (stat === false) {
    info("Remote directory not found — creating it.");
    await sftp.mkdir(remotePath, true);
    return;
  }
  if (stat !== "d") {
    throw new Error(
      `Remote path "${remotePath}" exists but is not a directory. Check SFTP_REMOTE_PATH in .env.`,
    );
  }
}

async function clearRemoteDir(sftp, remotePath) {
  const entries = await sftp.list(remotePath);
  if (entries.length === 0) {
    info("Remote directory is already empty.");
    return;
  }
  info(`Removing ${entries.length} entr${entries.length === 1 ? "y" : "ies"}...`);
  for (const entry of entries) {
    const entryPath = `${remotePath}/${entry.name}`;
    if (entry.type === "d") {
      await sftp.rmdir(entryPath, true);
    } else {
      await sftp.delete(entryPath);
    }
  }
}

function describeConnectionError(err) {
  if (err.code === "ECONNREFUSED") {
    return "Connection refused — verify SFTP_HOST and SFTP_PORT, and confirm you are on the VPN.";
  }
  if (err.code === "ENOTFOUND") {
    return `Host "${SFTP_HOST}" not found — check SFTP_HOST in .env and confirm you are on the VPN.`;
  }
  if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") {
    return "Connection timed out — confirm you are connected to the VPN.";
  }
  if (/authentication/i.test(err.message)) {
    return "Authentication failed — check SFTP_USER and SFTP_PASSWORD in .env.";
  }
  if (/no such file/i.test(err.message)) {
    return `Remote path not found — verify SFTP_REMOTE_PATH ("${SFTP_REMOTE_PATH}") in .env.`;
  }
  return null;
}

const TOTAL_STEPS = FORCE_PULL ? 5 : 4;

console.log("\n  ISE 2026 Ostrava — Production deployment");
console.log(`  Local  : ${SRC_DIR}`);
console.log(`  Remote : ${SFTP_HOST}:${SFTP_PORT}  ${SFTP_REMOTE_PATH}`);
if (FORCE_PULL) {
  console.log("  Sync   : enabled (--force-pull)");
}

const sftp = new SftpClient("ise-deploy");
let deployError = null;

try {
  let stepNumber = 1;

  if (FORCE_PULL) {
    step(stepNumber++, TOTAL_STEPS, "Force-pulling from origin");
    await forcePullFromOrigin();
  }

  step(stepNumber++, TOTAL_STEPS, "Connecting");
  await sftp.connect({
    host: SFTP_HOST,
    port: SFTP_PORT,
    username: SFTP_USER,
    password: SFTP_PASSWORD,
    readyTimeout: 20_000,
  });

  step(stepNumber++, TOTAL_STEPS, "Preparing remote directory");
  await ensureRemoteDir(sftp, SFTP_REMOTE_PATH);
  await clearRemoteDir(sftp, SFTP_REMOTE_PATH);

  step(stepNumber++, TOTAL_STEPS, "Uploading files");
  await sftp.uploadDir(SRC_DIR, SFTP_REMOTE_PATH);

  step(stepNumber++, TOTAL_STEPS, "Done");
  console.log("\n  Deployment complete.\n");
} catch (err) {
  deployError = err;
} finally {
  await sftp.end().catch(() => {});
}

if (deployError) {
  const hint = describeConnectionError(deployError);
  abort(`Deployment failed: ${deployError.message}`, hint ?? undefined);
}
