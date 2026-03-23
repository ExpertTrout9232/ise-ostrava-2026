# ISE 2026 Ostrava Project Guidelines

## Code Style

**Formatting standards** enforced by [.editorconfig](.editorconfig) and [.prettierrc](.prettierrc):
- Indentation: **2 spaces**
- Line endings: **LF (Unix)**
- Print width: **120 characters**
- Charset: **UTF-8**

**Linting & formatting tools**:
- [ESLint](eslint.config.js): Multi-language linting (JS, HTML, JSON, Markdown)
- [Prettier](package.json): Auto-formats code + organizes Tailwind classes
- **HTML specifics**: Required closing tags, attributes on single lines (see `eslint.config.js`)
- Run `npm run lint` to check violations; `npm run format` to auto-fix

## Architecture

This is a **static multi-page HTML site** for the ISE 2026 Ostrava conference.

**Pages**:
- [index.html](src/index.html) — Home/hero
- [program.html](src/program.html) — Conference schedule
- [registration.html](src/registration.html) — Registration form
- [venue.html](src/venue.html) — Location details
- [404.html](src/404.html) — Error page

**Template structure**: Each page includes HTML5 semantic markup, mobile-responsive navigation (desktop navbar + hamburger menu drawer), hero images, CSP headers, and Umami analytics.

**Key files**:
- [src/input.css](src/input.css) — Tailwind config & custom theme
- [src/js/main.js](src/js/main.js) — Mobile menu toggle logic
- [src/output.css](src/output.css) — Compiled CSS (ignored in git)

## Build and Test

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server (Tailwind watch + live-server on port 8080) |
| `npm run build` | Minify CSS for production |
| `npm run lint` | Check code quality across all file types |
| `npm run format` | Auto-format & organize classes |
| `npm run deploy` | Push to production via SFTP (requires `.env` with credentials) |

**Deployment flow**: `predeploy` hook auto-runs `build` before `deploy`, ensuring minified CSS.

## Conventions

### Tailwind CSS Custom Theme
See [src/input.css](src/input.css#L17-L48) for custom `@theme`:
- **Font**: IBM Plex Sans (variable font, includes wdth+wght axes)
- **Non-standard breakpoint**: `md: 688px` (not 768px)
- **Z-index**: Use semantic classes (e.g., `.z-navbar: 30`, `.z-mobile-menu: 50`)
- **Custom animations**: `.animate-darken`, `.animate-fade-in-up`, `.animate-fade-in-down`

### Mobile Menu Pattern
Expected selectors in all pages:
- `#menu-open-btn`, `#menu-close-btn` — Buttons
- `#side-drawer` — Navigation drawer
- `#menu-overlay` — Semi-transparent overlay

JavaScript toggles Tailwind classes (`opacity-*`, `pointer-events-*`, `translate-*`) to show/hide.

### Adding a New Page
1. Create file in `src/` (copy from [index.html](src/index.html) template)
2. Update `<title>`, `<meta description>`, OG tags for sharing
3. Add navigation link to all 4 existing pages
4. Run `npm run format` to auto-fix spacing & class organization
5. Run `npm run lint` to validate HTML structure
6. Test locally: `npm run dev` → http://localhost:8080/newpage.html

### Code Patterns
- **Images**: Use WebP format with fallbacks (`.webp` / `.jpg`)
- **Meta tags**: Include `charset` (UTF-8), `viewport`, `Content-Security-Policy`
- **Navigation**: All links point to `.html` files (no build-time routing)

## Production Deployment

Requires [.env](.env.example) with SFTP credentials (host, user, password, remote path).

Typical workflow:
1. Make changes locally
2. `npm run lint` → `npm run format` → commit & push
3. `npm run deploy` (runs `npm run build` automatically)
4. Deployed at https://ise-2026.osu.cz

**Setup troubleshooting**: If deploy fails, check VPN connectivity, SFTP credentials in `.env`, and that remote path exists on server.
