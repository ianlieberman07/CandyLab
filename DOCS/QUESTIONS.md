# Open questions and known gaps

Everything on this page needs an answer from the lab, or a decision from
whoever is running the rebuild. Nothing here has been guessed or filled in with
invented content.

Last updated: 11 August 2026, from a full crawl of `candylab.psych.ucla.edu`.

---

## Blocking — the site should not go live until these are settled

### 1. Contact details are missing entirely

The current site publishes **no postal address and no phone number** anywhere —
not on the Contact page, not in the footer. The only contact route is the email
address `uclacandylab@ucla.edu` and a web form.

The new site prints only what is supplied and silently omits the rest, so
nothing looks broken today. But a university lab site with no address is
unusual. **Needed:** building and room, mailing address, mail code, and a phone
number if there is one.

Fill these in from the admin under **Site Details → Contact details**.

### 2. The contact form has no back end

The old Contact page used a Gravity Forms form (a WordPress plugin). A static
site cannot run it. The Contact page currently offers the email address
instead, which works but is a downgrade.

Options, cheapest first:

- **Leave it as a mailto link.** Free, no dependency, no spam handling.
- **Formspree / Web3Forms / Netlify Forms.** A free tier is plenty for this
  volume; the form posts to their endpoint and they email the lab.
- **A UCLA-hosted form (Qualtrics or REDCap).** The lab already uses REDCap for
  the TIGER interest form, so this may be the path of least resistance and
  keeps the data inside UCLA.

**Decision needed** before launch.

### 3. Will UCLA IT point `candylab.psych.ucla.edu` at external hosting?

The lab currently sits on a UCLA-managed multisite WordPress install
(`sites.lifesci.ucla.edu/psych-candylab`). Ask UCLA Psychology IT whether they
will add a CNAME for the subdomain pointing at Cloudflare Pages.

Frame it as a **DNS request, not a hosting request** — a static site is a
folder of files, there is no runtime for them to support. Institutional IT
often refuses to host an unfamiliar framework but will happily add one record.

If they refuse, the site can be served from the built `dist/` folder on their
own infrastructure instead; that is a change of deploy target, not a rewrite.

### 4. Repository ownership

The repo is currently `ianlieberman07/CandyLab`, a personal account, and the
CMS sign-in points at an auth worker on a personal Cloudflare account. Before
handover, transfer both to an account the lab or the department controls, or
make sure a named person there has recovery access.

This is awkward to raise later and cheap to fix now.

---

## Content gaps

### 5. Dr. Ho's headshot is too small

Her photograph is **350 × 350 px** — the smallest image on the entire site.
Everyone else's is between 600 and 4000 px. On the People page it is displayed
in a 4:5 card, so it is both cropped and shown above its native resolution on
any high-density screen, and it looks soft next to the students around her.

It has not been upscaled — that would only make it blurrier. **A new photo at
1000 px or larger would fix it in one upload.**

### 5b. Three study images are very small

| Study | Size on the current site |
|---|---|
| MICA | 255 × 241 |
| WAVES | 270 × 187 |
| ENIGMA | 382 × 534 |

These are shown at their exact native size on a tinted panel rather than
stretched across the header, so they are as sharp as the source allows and
nothing looks broken. But on a high-density screen they will still read as
slightly soft, because there are only 255 pixels to work with.

If larger originals exist anywhere — the study's own materials, a slide deck —
they would upload straight over the top and look markedly better.

### 6. Sixteen pet photos have no descriptions

`/candy-lab-pets` carries 16 photographs with no caption and no alt text on the
current site. There is no way to write descriptions for them without knowing
whose pets they are, and inventing them is not an option.

They are silent for anyone using a screen reader. The build prints a warning
counting them until they are filled in, in the admin under **Pet photos**. A
caption (e.g. "Melanie's dog, Bagel") satisfies both needs at once.

### 7. Photo consent for the gallery and pets pages

The Lab Gallery (36 photos) and Meet Our Pets (16 photos) show identifiable
people, and in some cases their homes. These were carried over from the
existing public site, so they are not new exposure — but a rebuild is a
sensible moment to confirm that everyone pictured is still happy to be, and
that departed members have not asked to be removed.

### 8. "Resources", "Advice" and "Tutorials" are empty

All three say only "Coming Soon" on the current site. They have been carried
over with that state preserved and are marked as incomplete, so each shows a
visible notice. Either write them or untick **Show in the menu** — as of now
they are already out of the top menu and reachable only from the footer.

### 9. The ENIGMA sub-page — resolved: dropped

It was rebuilt with resolved DOIs (17 entries, 15 verified), then removed at
the client's direction on 14 Aug 2026. The resolved data survives in git
history (content/enigma-papers.json before commit removing it) if the decision
is ever reversed.

---

## Things that were corrected during the move — please confirm

### 10. One publication linked to the wrong paper

On the current site, *"Value-Based Cognitive Control Moderates the Relation of
Inflammation with Depression in Adolescents"* links to
`nature.com/articles/s41386-025-02243-8` — which is the **Neuropsychopharmacology
editorial** listed directly beneath it, not this paper.

The heading also contains a second, hidden link to the correct article, so this
looks like a WordPress editing accident rather than a mistake in the citation.

The new site uses the registered DOI, **`10.1093/scan/nsaf121`** (*Social
Cognitive and Affective Neuroscience*). Please confirm.

### 11. Two study names had a status note inside the title

- "…Gateways to Emotion (BRIDGE) – COMING SOON!"
- "…High Risk Adolescents (MICA)*[Data Analysis Stage]*"

The words are unchanged, but the status has been moved out of the heading into
a small tag beside it, so the title reads as a title. (It also stops the
asterisks printing literally, which they were doing.) Editable per study in the
admin under **Status tag**.

### 12. One 2026 paper's only free copy is a preprint

*"Childhood Maltreatment and Deviations from Normative Brain Structure"*
(*Biological Psychiatry*, 2026) is paywalled at the publisher. A bioRxiv
preprint of it is free.

The site links the publisher page as the paper and labels the bioRxiv copy
**"Free preprint"** rather than "Read it free", so nobody is told the published
article is free when it is not. Flagged as **Needs checking** in the admin.

---

## Where the publication data came from

All 92 entries were transcribed from the lab's own Publications page, then each
was matched against **OpenAlex** and **Crossref** to recover its registered DOI
and its open-access status (which OpenAlex derives from Unpaywall).

- **92 of 92** now carry a registered DOI.
- **78 of 92** are open access. Of those, 23 have a free copy at an address
  different from the DOI (PubMed Central, a repository, a preprint server);
  for the other 55 the publisher's own page is the free one, so the site
  labels that single link "Read it free" rather than printing the same URL
  twice.
- A paper is only ever labelled free when Unpaywall says so. No link is
  labelled free on the basis of the domain it sits on.

Link verification: every DOI and free-copy URL was requested. All resolved
except 22 that answer `403` to an automated request — Oxford University Press,
Wiley, JAMA, J Neurosci and ScienceDirect block bots. Those DOIs come from
Crossref, which is the registration authority, so they are correct by
construction; they were not spot-checked by hand in a browser.

---

## Which papers can be reused, and what that yielded

Every open-access paper was checked against the **PMC Open Access Subset**. This
is the distinction that matters and it is easy to get wrong: a paper can be free
to *read* in PubMed Central under the NIH public access policy and still not be
licensed for *reuse*. OpenAlex's licence field reported one CC BY paper; PMC
reports forty in the OA subset.

| Licence | Papers | What may be done |
|---|---|---|
| CC BY | 18 | Reproduce and crop, with attribution |
| CC BY-NC | 6 | Same, non-commercially — a university lab site qualifies |
| CC BY-NC-ND | 15 | Reproduce whole only. **Not croppable** |
| none stated | 1 | Treat as all rights reserved |
| Not in the OA subset | 37 | Free to read, **not** licensed for reuse |

The 15 ND papers are deliberately excluded from reuse here. Cropping a figure
into a page banner is a derivative work, which "NoDerivatives" does not permit.

**What the 24 usable papers actually contain:** box plots, scatter plots, path
diagrams, CONSORT flow charts and results tables. Exactly one figure works as
cover imagery — the default mode and salience network maps from Ho et al. 2021
(*Translational Psychiatry*, CC BY), now a full-width band on the Publications
page with a visible credit.

This is recorded so nobody repeats the search expecting a different answer.
**Her published figures are not a source of cover imagery.** They are figures.

### Note for anyone re-running this

PMC's figure images could not be retrieved programmatically: `/bin/` hotlinks
return HTML, the FTP `oa_package` tree was deprecated and removed in 2026, and
the replacement AWS Open Data bucket (`pmc-oa-opendata`) carries text and XML
only. The figures here came from the publishers' own pages via the DOI. The
licence audit in `scripts/`-adjacent scratch work is the reusable part.

---

### 15. Seven members have no headshot

Nicolette Recchia, Jessica Simonson, Saché Coury, Jasper Laca, Elizabeth
McNeilly, Amar Ojha and Haley Wang have no photograph on the current site, and
Miles Tardif's "photo" there is a stock grey avatar. Their cards show initials,
by design.

These need to come FROM THE LAB. Photographs of real people must not be pulled
from a web search: an image found online is someone's copyrighted work and
someone's likeness, and publishing it on the lab's site without their consent
is a real harm, not a formality. One email from the lab manager asking each
person for a headshot solves it in a day.

---

## Design and branding

### 13. Is there a UCLA branding policy that constrains the palette?

The site uses a pale slate ground, deep navy and one teal signal colour, with
UCLA blue and gold kept as a small institutional nod in the footer. Worth
checking with the UCLA Psychology web team whether anything stricter applies.

### 14. There is no share image yet

There is no Open Graph image, so links shared on Slack, iMessage or Twitter
show a plain text card. This is deliberate — a share tag pointing at a file
that does not exist is worse than none, because some clients cache the failure.

**Needed:** one 1200 × 630 image the lab is happy to represent it. Then restore
the `og:image` tags in `src/layouts/Base.astro` (they are commented, with a
note).

---

## Not carried over, on purpose

- **The WordPress "Participate" page duplicated the home page's study copy.**
  It is now one page, linked from the home page and the menu.
- **The `/feed/` RSS URL** from WordPress. Can be added back if wanted.
- **The UCLA Psychology header logo image** used by the old theme. The new
  header is typographic.
