# Repository Guidelines

## Project Structure & Modules

This is a React 19, TypeScript, and Vite application for NvN.Plus TV. Main UI code lives in `src/`: `components/` and `telas/` contain reusable views and screens; `hooks/`, `contexts/`, `services/`, `utils/`, and `types/` hold supporting logic. Static assets and PWA files are in `public/`; Cloudflare Pages endpoints are in `functions/`, with related Vercel handlers in `api/`. Smart TV loaders and packaging sources are under `tv/`; build and publishing helpers are in `scripts/`. Automated tests are in `tests/` as Node test runner `.test.mjs` files.

## Build, Test, and Development

- `npm install` installs dependencies (Bun is also supported).
- `npm run dev` starts the Vite development server at `http://localhost:5173`.
- `npm run build` type-checks and builds the site, then runs the TV-to-site script. This script uses Bash.
- `npm run lint` runs ESLint across the repository.
- `npm run preview` serves the production build locally.
- `node --test` runs the Node tests. There is no `npm test` script or configured coverage threshold.

## Style & Naming

Follow the existing TypeScript and React patterns. Use two spaces for indentation, single quotes in TS/TSX, and semicolons. Name React components and screen files in `PascalCase` (for example, `AppHeader.tsx`); use `camelCase` for hooks (`useCanais.ts`), utilities, services, and functions. Keep tests named `*.test.mjs`. ESLint is configured in `eslint.config.js` for TypeScript, React Hooks, and React Refresh; run `npm run lint` before submitting.

## Testing

Add or update focused tests in `tests/` for behavior changes, using `node:test` and `node:assert/strict`. Keep test names descriptive and written consistently with the existing Portuguese test suite. Run `node --test` and `npm run lint`; run `npm run build` for changes affecting application or packaging code.

## Commits & Pull Requests

Recent commits follow Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`), with concise descriptions commonly written in Portuguese. Use the same format. PRs should explain user-visible changes, list validation commands and results, link related issues when available, and include screenshots for UI changes. Call out changes to deployment functions, TV packaging, or configuration explicitly.

## Security & Configuration

Do not commit credentials, private stream URLs, or local environment files. Treat catalog and stream URLs as external inputs; preserve the proxy and validation behavior when changing related endpoints.
