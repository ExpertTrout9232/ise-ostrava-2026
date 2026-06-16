import { statSync } from "fs";
import { resolve, sep } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const liveServer = require("live-server");

const ROOT_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC_DIR = resolve(ROOT_DIR, "src");
const PUBLIC_DIR = resolve(ROOT_DIR, "public");

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function localPathFromRequest(baseDir, requestPath) {
  const candidate = resolve(baseDir, `.${requestPath}`);
  if (candidate !== baseDir && !candidate.startsWith(`${baseDir}${sep}`)) {
    return null;
  }
  return candidate;
}

function buildCandidates(requestPath) {
  const trimmedPath = requestPath === "/" ? "/index.html" : requestPath;
  const candidates = [trimmedPath];

  if (trimmedPath.endsWith("/")) {
    candidates.push(`${trimmedPath}index.html`);
  } else {
    candidates.push(`${trimmedPath}.html`);
    candidates.push(`${trimmedPath}/index.html`);
  }

  return candidates;
}

function rewriteToExistingFile(req, res, next) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    next();
    return;
  }

  for (const candidate of buildCandidates(pathname)) {
    for (const baseDir of [SRC_DIR, PUBLIC_DIR]) {
      const localPath = localPathFromRequest(baseDir, candidate);
      if (localPath && isFile(localPath)) {
        req.url = `/${localPath.slice(ROOT_DIR.length + 1).split(sep).join("/")}`;
        next();
        return;
      }
    }
  }

  next();
}

liveServer.start({
  root: ROOT_DIR,
  open: false,
  port: 8080,
  middleware: [rewriteToExistingFile],
  logLevel: 1,
});
