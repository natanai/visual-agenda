# Visual Agenda

Visual Agenda is a static HTML/CSS/JavaScript app. It has no build step and no backend.

## Run locally

Open `index.html` in a browser.

No npm install, build command, local server, package manager, or external CDN is required.

## Host on GitHub Pages

1. Go to repository **Settings**.
2. Go to **Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Set **Branch** to the branch containing `index.html`.
5. Set **Folder** to `/(root)`.
6. Save.

The app is designed to be served directly from the branch root. The root app files are:

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`
- `README.md`

All asset paths are relative, so the app can load from GitHub Pages, a local file URL, or any static file host.
