# Visual Agenda

A frontend-only meeting agenda timer for seeing where time is being spent and how that affects the remaining agenda.

## Static hosting / GitHub Pages

This is a static Vite app. It has no backend and can be hosted from the `dist/` folder.

Local development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

GitHub Pages:
This repo deploys through GitHub Actions. In repository **Settings → Pages**, set Source to **GitHub Actions**.

The Vite base path is:

- `/` during local development and Codex preview
- `/visual-agenda/` during GitHub Actions builds

The expected project Pages URL is:

```text
https://<your-github-username>.github.io/visual-agenda/
```

The workflow installs dependencies, runs tests, runs `npm run build`, uploads the generated `dist/` folder, and deploys that artifact to Pages. Do not publish the raw repository files directly; Vite must compile `src/main.tsx` into static assets first.

## Local setup

```bash
npm install
npm run dev
```
