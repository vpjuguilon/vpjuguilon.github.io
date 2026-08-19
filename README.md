# vpjuguilon.github.io

Personal site — physics research, patent kinematics project, THz Bench tool,
and notes, built with Jekyll and deployed via GitHub Pages.

## What's in here

```
_config.yml         Site settings (title, description, plugins)
index.html           Homepage
_pages/cv.md          CV page (content is placeholder — fill in your details)
_layouts/default.html Site chrome: head, nav, footer
_layouts/post.html    Layout for future blog posts (not used yet)
_includes/trajectory.svg   The inline "phase trajectory" signature graphic
assets/css/main.css   All site styling
_posts/                Empty for now — this is where future blog posts go
.github/workflows/pages.yml   Builds & deploys automatically on every push
```

## 1. Push this to GitHub

1. Create a new repository on GitHub named exactly `vpjuguilon.github.io`
   (the exact name matters — that's what tells GitHub Pages this is your
   user site).
2. From this folder:
   ```bash
   git init
   git add -A
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/vpjuguilon/vpjuguilon.github.io.git
   git push -u origin main
   ```

## 2. Turn on GitHub Pages

In the repo: **Settings → Pages → Build and deployment → Source** → select
**GitHub Actions**. The included workflow (`.github/workflows/pages.yml`)
will build and publish automatically. After the first push, check the
**Actions** tab — once the workflow run turns green, your site is live at
`https://vpjuguilon.github.io`.

## 3. Fill in the CV

Open `_pages/cv.md` and replace everything in `[brackets]` — degree dates,
your undergrad institution, contact email, LinkedIn URL, publications, and
awards. Same for the LinkedIn link placeholder in `index.html`.

## 4. (Optional) Custom domain

1. Buy a domain (Namecheap, Cloudflare, etc.).
2. Add a file named `CNAME` to the repo root containing just your domain,
   e.g. `vincejuguilon.com`.
3. At your domain registrar, point DNS: either an `ALIAS`/`ANAME` record at
   the apex to `vpjuguilon.github.io`, or a `CNAME` record on a subdomain
   (like `www`) to the same.
4. Update `url:` in `_config.yml` and the `Sitemap:` line in `robots.txt`
   to match your new domain.

## 5. Preview locally (optional)

You don't need Ruby/Jekyll installed to publish — GitHub Actions handles the
build. But if you want to preview changes before pushing:

```bash
bundle install
bundle exec jekyll serve
# visit http://localhost:4000
```

## 6. Adding a blog post later

Add a file to `_posts/` named `YYYY-MM-DD-title.md` with front matter:

```yaml
---
layout: post
title: "Your Post Title"
---
Your content here, in Markdown.
```

It'll pick up the `post` layout and publish automatically on the next push.
