# SaveSignal — Operations Console

AI-assisted disaster early-warning and rescue mesh network concept, built by **:4-ever** for the Korea-ASEAN Youth Diplomacy Program (**YCAFE 2026**).

A 4-page static site — no build step, no backend:

- `index.html` — Home
- `about.html` — About Us
- `product.html` — Product: tabbed Pre-/Post-Disaster architecture, flow diagrams, and a live interactive mesh-rescue demo (self-healing routing simulation)
- `contact.html` — Contact

## Live site

Once GitHub Pages is enabled (Settings → Pages → Deploy from branch `main`, folder `/`):

**https://deolianatilman-rgb.github.io/savesignal-console/**

## Stack

Plain HTML/CSS/JS. Tailwind is precompiled to `css/tailwind.css` (no CDN), and fonts (Inter, IBM Plex Mono) are self-hosted as base64 `woff2` in `css/fonts.css` — the whole site runs with zero external network dependencies.
