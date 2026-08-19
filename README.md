# vpjuguilon.github.io

Personal site — physics research, patent kinematics project, THz Bench tool,
and notes, built with Jekyll and deployed via GitHub Pages.

## What's in here

```
_config.yml                  Site settings (title, description, plugins)
index.html                   Homepage
_pages/cv.md                 CV page
_layouts/default.html        Site chrome: head, nav, footer
_layouts/post.html           Layout for future blog posts
_includes/trajectory.svg     The inline "phase trajectory" graphic
_includes/theme-init.html    Sets dark mode before paint (no flash)
assets/css/main.css          All site styling — accent color set at the top
assets/js/theme.js           Light/dark toggle
assets/img/                  Your photos
assets/files/                Your CV PDF
_posts/                      Future blog posts
.github/workflows/pages.yml  Builds & deploys on every push
```

## Changing the color scheme

Open `assets/css/main.css`. The first block of the file has two values:

```css
:root {
  --accent-light: #2C7A7B;
  --accent-dark:  #5DCAA5;
}
```

Change those and the whole site recolors — links, buttons, section
headers, the trajectory graphic. You need both: one for light mode, one
for dark. The dark value should be lighter and less saturated so it
reads on a dark background.

Several tested pairs are listed in the comment above that block. If you
pick your own, check it at webaim.org/resources/contrastchecker against
the page background (#F7F7F4 light, #14161C dark) and aim for 4.5:1.

## Dark mode

Visitors get a ◐ toggle in the nav. Their choice saves in the browser.
If they've never chosen, the site follows their operating system
setting.

## Files you need to add

```
assets/img/casual.jpg           casual photo (homepage)
assets/img/professional.jpg     professional photo (CV page)
assets/files/vpjuguilon-cv.pdf  the downloadable CV
```

Names must match exactly, or edit the paths in `index.html` and
`_pages/cv.md`.

Photos: crop square, export around 400x400px so they stay sharp on
retina screens, keep under ~200 KB, use JPG. For .png, change the
extension in the src paths.

## Printing

Ctrl+P on the /cv/ page produces a clean printout — nav, footer, and
buttons hidden, colors flattened to black on white. A useful backup for
when the web CV is newer than the uploaded PDF.

## Publishing changes

```bash
git add -A
git commit -m "Your message"
git push
```

GitHub Actions rebuilds and republishes automatically. Check the Actions
tab; green means live.

## Custom domain (optional)

1. Buy a domain (Namecheap, Cloudflare, etc.).
2. Add a file named `CNAME` at the repo root containing just your domain.
3. At your registrar, point DNS: an `ALIAS`/`ANAME` at the apex to
   `vpjuguilon.github.io`, or a `CNAME` on a subdomain to the same.
4. Update `url:` in `_config.yml` and the `Sitemap:` line in `robots.txt`.

## Preview locally (optional)

```bash
bundle install
bundle exec jekyll serve
# visit http://localhost:4000
```

## Adding a blog post

Add a file to `_posts/` named `YYYY-MM-DD-title.md`:

```yaml
---
layout: post
title: "Your Post Title"
---
Your content here, in Markdown.
```
