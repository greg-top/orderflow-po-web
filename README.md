# OrderFlow Product Owner Web

Public React client for student refinement sessions with the OrderFlow Product Owner. It provides session entry, a conversation view, question limits, session completion and server-generated transcript download.

This repository contains only UI code, public API contracts and frontend tests. It does not contain business Knowledge, agent prompts, private evals, source PDFs or secrets.

## Development

Use Node.js 24 and pnpm 11.19:

```text
pnpm install --frozen-lockfile
copy .env.example .env.local
pnpm dev
```

Set `VITE_API_BASE_URL` to the Worker origin. The access code is submitted directly to the Worker and is never written to localStorage, sessionStorage, IndexedDB or application logs. The session token is retained only in React memory.

## Quality and build

```text
pnpm check
pnpm test:coverage
```

Vite uses the repository base path `/orderflow-po-web/`. Production builds disable source maps.

## GitHub Pages

Set the repository variable `VITE_API_BASE_URL` to the production Worker URL and configure Pages to use GitHub Actions. The workflow installs from the lockfile, runs lint and tests, builds `dist`, uploads the Pages artifact and deploys it.
