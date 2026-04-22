# Copilot cloud agent instructions for `ise-ostrava-2026`

## Repository overview
- This is a static conference website (HTML/CSS/JS) with Tailwind CSS.
- Main source files are in `src/`.
- Extra static files are in `public/`.
- Deployment helper script is `scripts/deploy.mjs` (SFTP upload).

## Key conventions
- `src/output.css` is generated from `src/input.css` via Tailwind.
- Do not hand-edit `src/output.css`; regenerate it with `npm run build`.
- Keep edits minimal and scoped to the requested task.

## Setup
- Required runtime: Node `>=20`, npm `>=10` (see `package.json`).
- Install dependencies with:
  - `npm ci`

## Useful commands
- Local dev (Tailwind watch + live server):
  - `npm run dev`
- Build CSS:
  - `npm run build`
- Lint:
  - `npm run lint`
- Format source files:
  - `npm run format`

## Validation workflow for changes
- There is no automated test suite (`npm test` is not defined).
- Validate with:
  1. `npm run lint`
  2. `npm run build`
- If CSS or classes changed, ensure regenerated `src/output.css` is included in commits.

## CI/CD notes
- GitHub Actions workflow: `.github/workflows/node.js.yml`.
- On push to `main`, CI installs dependencies, runs `npm run build`, then deploys `src/` + `public/` to GitHub Pages.

## Production deploy notes (manual)
- `npm run deploy` runs `scripts/deploy.mjs` and requires `.env` values from `.env.example`:
  - `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_REMOTE_PATH`
  - Optional `SFTP_PORT` (defaults to `22`)

## Errors encountered during onboarding and workarounds
1. **`npm test` fails with `Missing script: "test"`**
   - Workaround: use `npm run lint` and `npm run build` as the project’s validation baseline.

2. **`npm ci` reports deprecated-package warnings and `9 vulnerabilities`**
   - Workaround: treat as known baseline unless the task is dependency/security maintenance.
   - Do not run blind `npm audit fix --force` during unrelated changes; it may introduce breaking dependency updates.
