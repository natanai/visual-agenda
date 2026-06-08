# Visual Agenda

A frontend-only meeting agenda timer for seeing where time is being spent and how that affects the remaining agenda.

## Local development

```bash
npm install
npm run dev
```

## GitHub Pages deployment

This repository is configured to build and deploy entirely from GitHub using the workflow in `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub with the default branch named `main`.
2. In the GitHub repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` or manually run the **Deploy GitHub Pages** workflow.

The workflow installs dependencies, runs `npm run build`, uploads the generated `dist/` folder, and deploys that artifact to Pages. Do not publish the raw repository files directly; Vite must compile `src/main.tsx` into static assets first.

The Vite base path is set to `/visual-agenda/`, so the expected project Pages URL is:

```text
https://<your-github-username>.github.io/visual-agenda/
```

If you deploy to a custom domain root instead, update `base` in `vite.config.ts` to `/` before building.
