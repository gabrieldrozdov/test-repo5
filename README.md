# Turbo test

A throwaway site for trying Decap Turbo with drafts, before moving Archivo Latino onto it.

- `content/entries/` is a folder collection, one json file per entry
- `content/about.json` is a single page
- `admin/` is the cms: drafts are on (`publish_mode: editorial_workflow`), and there is a custom
  preview for entries and a custom Figure button, to check both still run on turbo
- `node build.js` writes the site into `public/` (no dependencies, nothing to install)

## Setting it up

1. Make a new GitHub repo from this folder and push it.
2. In Cloudflare, Workers & Pages > Create > Import a repository, pick the repo. Build command
   `npm run build`, deploy command `npx wrangler deploy`. It publishes at a `*.workers.dev` address.
3. In Turbo, create the site for the repo (branch `main`, config at `admin/config.yml`, admin URL
   `https://<your-address>.workers.dev/admin/`).
4. Paste the site id from Turbo's overview tab into `turbo_site_id` in `admin/config.yml`, then push.

## What to test

1. Log in at `/admin/`.
2. Edit an entry and save: it should become a draft in the Workflow tab, and the site should not change.
3. Check the preview pane says "custom preview".
4. Add a Figure with an uploaded image and a caption, save, and check the preview shows it.
5. Create a new entry and save it as a draft too.
6. Publish the drafts from the Workflow tab, wait for the Cloudflare build, and check the site
   (the time at the bottom says when it was last built).
7. Edit the About page, save, publish, check again.
