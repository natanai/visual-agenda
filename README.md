# Visual Agenda

Visual Agenda is a static HTML/CSS/JavaScript app for running meetings with a visual time budget.

It has no build step, no backend, and no dependencies.

## Run locally

Open `index.html` in a browser.

## Host on GitHub Pages

1. Push these files to GitHub.
2. Open repository Settings.
3. Go to Pages.
4. Set Source to “Deploy from a branch.”
5. Choose main.
6. Choose /root.
7. Save.

## Main idea

The meeting is treated as a shared time budget. Agenda items are vertical blocks. When the current topic takes longer than planned, it stretches and the future items shrink, making the tradeoff visible to everyone.

Off Topic mode adds visible off-topic blocks that consume the remaining meeting budget, so side conversations have an obvious cost.

## Static files only

This repository is intentionally only:

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`
- `README.md`

There is no package manager, build tool, framework, external CDN, server, or generated output.
