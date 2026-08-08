# Herbal Goodness Command Center — Railway deploy

This folder is ready to push straight to GitHub and deploy on Railway. It contains:

- `index.html` — the dashboard itself (single self-contained file)
- `package.json` — tells Railway how to serve it (a tiny static file server, `serve`)

## 1. Push this folder to GitHub

If you don't have a GitHub account yet, create one free at github.com — takes about a minute.

1. Go to github.com → **New repository**. Name it something like `herbal-goodness-dashboard`. Keep it **Public** or **Private** (either works with Railway) and don't add a README/gitignore (you already have files).
2. On the new repo's page, click **uploading an existing file**, then drag in `index.html` and `package.json` from this folder, and commit.

(If you're comfortable with git on the command line instead: `git init`, `git add .`, `git commit -m "dashboard"`, `git remote add origin <your-repo-url>`, `git push -u origin main`.)

## 2. Connect it to Railway

1. Log into railway.app.
2. **New Project** → **Deploy from GitHub repo** → pick the repo you just created (you may need to click "Configure GitHub App" once to give Railway access to your repos).
3. Railway will detect the `package.json` and build it automatically (Nixpacks). No other settings needed.
4. Once it finishes deploying, open the service → **Settings** tab → **Networking** → **Generate Domain**. Railway gives you a public URL like `herbal-goodness-dashboard-production.up.railway.app`.

That URL is your shareable link — open it, and anyone you send it to sees the live dashboard, no download required.

## 3. Updating it later (weekly refresh)

Whenever you get a fresh copy of the dashboard (e.g. from the weekly automated regeneration), replace `index.html` in the GitHub repo — either drag-and-drop the new file on the repo's page (GitHub will prompt you to commit the replacement) or `git add . && git commit -m "weekly update" && git push` if using the command line. Railway auto-redeploys within a minute or two of any push — no need to touch Railway itself again.

## Custom domain (optional)

If you want something like `dashboard.herbalgoodnessco.com` instead of the `*.up.railway.app` address: in Railway's Networking settings, click **Custom Domain**, enter it, and add the CNAME record it gives you to your domain's DNS (wherever herbalgoodnessco.com is managed). Propagation usually takes a few minutes to a few hours.
