# Deploying the CANDY Lab site

**Status: not deployed yet.** Nothing here has been run for this site. The same
setup is in production for the sibling SAN Lab site, so the shape is known to
work, but every step below still has to be done and verified for this one.

Nothing in this document should be read as "already true".

---

## What it is

A static site. `npm run build` produces a `dist/` folder of plain HTML, CSS,
images and one small JavaScript file. There is no server, no database and no
runtime — which is the whole reason it can be hosted almost anywhere, and why
the ask of UCLA IT is a DNS record rather than a machine to look after.

---

## 1. Push the repository

```bash
gh repo create CandyLab --private --source . --push
```

The CMS config already names `ianlieberman07/CandyLab`
(`public/admin/config.yml`, `backend.repo`). If the repository lands somewhere
else, correct that one line — it is the only place the name appears.

See DOCS/QUESTIONS.md #4 on transferring ownership to the lab before handover.

---

## 2. Connect Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick the repository.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Node version | 20 or later |

3. Deploy. You get a `candylab.pages.dev` address (or a variant of it).

Every push to `main` redeploys — which means every save in the admin
redeploys, since a save is a commit.

### The `SITE_URL` variable

`astro.config.mjs` defaults `site` to `https://candylab.pages.dev`. That
default is deliberate: it is where the site is genuinely served from before
launch, so canonical URLs and share previews point at something real, and —
because it does not match `PRODUCTION_HOST` in `src/config.ts` — the whole site
is `noindex`ed and `robots.txt` disallows everything automatically.

**If the pages.dev address Cloudflare assigns is not exactly
`candylab.pages.dev`, set `SITE_URL` to whatever it is** in the Pages build
variables. Otherwise canonicals point at an address that is not serving the
site.

---

## 3. Set up the admin sign-in worker

The CMS signs in through GitHub OAuth, and OAuth needs one small server-side
piece to hold the client secret. Sveltia publishes exactly that:
`github.com/sveltia/sveltia-cms-auth`.

1. Deploy it as its own Cloudflare Worker (its README has a deploy button).
2. Create a GitHub OAuth app — GitHub → Settings → Developer settings → OAuth
   Apps → **New OAuth App**:

   | Field | Value |
   |---|---|
   | Application name | CANDY Lab site editor |
   | Homepage URL | the site's address |
   | Authorization callback URL | `https://<your-worker>.workers.dev/callback` |

3. Set the worker's variables:

   | Variable | Value |
   |---|---|
   | `GITHUB_CLIENT_ID` | from the OAuth app |
   | `GITHUB_CLIENT_SECRET` | from the OAuth app — **encrypted** |
   | `ALLOWED_DOMAINS` | the site's hostname |

   `ALLOWED_DOMAINS` is what stops an unrelated site pointing at this worker to
   borrow its OAuth app. Set it.

4. Put the worker's address in `public/admin/config.yml`:

   ```yaml
   backend:
     base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
   ```

   Without this line, sign-in falls back to `api.netlify.com`, which only works
   for Netlify-hosted sites. It fails with "Authentication aborted."

---

## 4. Give Dr. Ho access

Add her GitHub account as a **collaborator with write access** to the
repository. That is the entire permission model: the CMS runs in her browser
and writes through the GitHub API as her, so GitHub — not anything in this
repo — decides who can save.

A stranger can load `/admin` and sign in with their own GitHub account, browse
the content, and then fail to save. Everything they can see is already public
on the site and in the repository, so it is untidy rather than dangerous. If
that matters, put Cloudflare Access in front of `/admin` — note this requires
a hostname in a zone you control, so it can only be done **after** the custom
domain is live, not on `pages.dev`.

**To verify once deployed** (none of this has been checked for this site yet):

- An account with no write access can sign in but cannot save.
- Another origin pointing at the worker is rejected with `UNSUPPORTED_DOMAIN`.
- No token or secret is committed anywhere in the repository.

---

## 5. The cutover — order matters

The last step is the one everyone forgets, and its failure is silent.

1. **DNS first.** UCLA Psychology IT adds a CNAME for
   `candylab.psych.ucla.edu` pointing at the Pages project. Add the custom
   domain in Cloudflare Pages so the certificate is issued.
2. **Verify** the new site is genuinely serving over that hostname with a valid
   certificate:

   ```bash
   curl -sI https://candylab.psych.ucla.edu/ | head -20
   ```

3. **Update the allowlists before the switch, not after.** Put both the old and
   new hostnames in `ALLOWED_DOMAINS` and in the OAuth app's callback URL, so
   there is never a window where the admin is broken.
4. **Only then, flip to production mode.** Set `SITE_URL` to
   `https://candylab.psych.ucla.edu` in the Pages build variables and redeploy.

Step 4 is the one that gets missed. Skip it and the site goes live still asking
search engines to ignore it: nothing errors, nothing looks wrong, and it simply
never appears in search results.

Confirm it worked:

```bash
curl -s https://candylab.psych.ucla.edu/robots.txt
```

It should read `Allow: /` and list the sitemap — not `Disallow: /`.

---

## Before you flip the switch

Run the checks the build already performs, then the ones it cannot:

```bash
npm run build
```

That runs `scripts/check-admin-config.mjs` before the build (the CMS config
parses, and every image field has a description field beside it) and
`scripts/check-build.mjs` after it (no image missing its `alt`, no internal
link broken, `noindex`/`robots.txt`/sitemap agreeing).

Then, by hand:

- [ ] Everything still open in DOCS/QUESTIONS.md is answered or accepted
- [ ] Dr. Ho signs in and makes one real edit, and it reaches the live site.
      Everything before that is theory
- [ ] The site reads correctly at 375 px wide and at 1440 × 700
- [ ] Keyboard navigation reaches every link, and focus is always visible
- [ ] A share preview renders (needs the Open Graph image — QUESTIONS.md #14)
