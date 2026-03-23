/*
Production deployment script.

Builds the site, clears the remote directory over SFTP, and uploads src/ + public/.
Run via: npm run deploy

Required variables in .env (see .env.example):
SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH

Optional:
SFTP_PORT (default: 22)
*/

import "dotenv/config";
import SftpClient from "ssh2-sftp-client";
import { cp, mkdtemp, readdir, rm, stat } from "fs/promises";
import { resolve, dirname, relative, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = resolve(ROOT_DIR, "src");
const PUBLIC_DIR = resolve(ROOT_DIR, "public");

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

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

async function collectRelativeFiles(baseDir, currentDir = baseDir, files = []) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectRelativeFiles(baseDir, entryPath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(relative(baseDir, entryPath).split(sep).join("/"));
    }
  }
  return files;
}

function listConflicts(srcFiles, publicFiles) {
  const srcSet = new Set(srcFiles);
  return publicFiles.filter((file) => srcSet.has(file)).sort();
}

async function prepareLocalUploadBundle() {
  if (!(await isDirectory(SRC_DIR))) {
    throw new Error(`Local source directory not found: "${SRC_DIR}"`);
  }

  const srcFiles = await collectRelativeFiles(SRC_DIR);
  const hasPublicDir = await isDirectory(PUBLIC_DIR);
  const publicFiles = hasPublicDir ? await collectRelativeFiles(PUBLIC_DIR) : [];
  const conflicts = listConflicts(srcFiles, publicFiles);

  if (conflicts.length > 0) {
    const maxPreview = 10;
    const preview = conflicts.slice(0, maxPreview).join(", ");
    const extra =
      conflicts.length > maxPreview ? ` (+${conflicts.length - maxPreview} more)` : "";
    throw new Error(
      `Path conflict${conflicts.length > 1 ? "s" : ""} detected between src/ and public/: ${preview}${extra}.`,
    );
  }

  const deployDir = await mkdtemp(resolve(tmpdir(), "ise-deploy-"));
  await cp(SRC_DIR, deployDir, { recursive: true, force: true });

  if (hasPublicDir) {
    await cp(PUBLIC_DIR, deployDir, { recursive: true, force: true });
  } else {
    info("public/ directory not found — deploying src/ only.");
  }

  info(
    `Prepared ${srcFiles.length + publicFiles.length} file${
      srcFiles.length + publicFiles.length === 1 ? "" : "s"
    } for upload (${srcFiles.length} from src${hasPublicDir ? `, ${publicFiles.length} from public` : ""}).`,
  );

  return deployDir;
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

const TOTAL_STEPS = 5;

console.log("\n  ISE 2026 Ostrava — Production deployment");
console.log(`  Local  : ${SRC_DIR} + ${PUBLIC_DIR}`);
console.log(`  Remote : ${SFTP_HOST}:${SFTP_PORT}  ${SFTP_REMOTE_PATH}`);

const sftp = new SftpClient("ise-deploy");
let deployError = null;
let localUploadDir = null;

try {
  step(1, TOTAL_STEPS, "Preparing local upload bundle");
  localUploadDir = await prepareLocalUploadBundle();

  step(2, TOTAL_STEPS, "Connecting");
  await sftp.connect({
    host: SFTP_HOST,
    port: SFTP_PORT,
    username: SFTP_USER,
    password: SFTP_PASSWORD,
    readyTimeout: 20_000,
  });

  step(3, TOTAL_STEPS, "Preparing remote directory");
  await ensureRemoteDir(sftp, SFTP_REMOTE_PATH);
  await clearRemoteDir(sftp, SFTP_REMOTE_PATH);

  step(4, TOTAL_STEPS, "Uploading files");
  await sftp.uploadDir(localUploadDir, SFTP_REMOTE_PATH);

  step(5, TOTAL_STEPS, "Done");
  console.log("\n  Deployment complete.\n");
} catch (err) {
  deployError = err;
} finally {
  await sftp.end().catch(() => {});
  if (localUploadDir) {
    await rm(localUploadDir, { recursive: true, force: true }).catch(() => {});
  }
}

if (deployError) {
  const hint = describeConnectionError(deployError);
  abort(`Deployment failed: ${deployError.message}`, hint ?? undefined);
}
