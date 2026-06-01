# Shan Islam personal site

Astro personal site and blog for writing about pricing, experimentation, forecasting and practical data science.

## Local development

Install dependencies and run the local dev server:

```bash
npm install
npm run dev
```

The local dev server is usually available at:

```text
http://localhost:4321
```

## Build check

Build the site for production:

```bash
npm run build
```

This should succeed before committing or deploying.

## Creating a new blog post

Astro doesn't require a special command to create posts. Add a Markdown file to:

```text
src/content/blog/
```

Example:

```text
src/content/blog/the-cost-of-waiting-for-certainty.md
```

Example frontmatter:

```markdown
---
title: "The cost of waiting for certainty"
description: "Why commercial experimentation is about making the right decision under uncertainty, not waiting for perfect statistical purity."
pubDate: 2026-06-01
tags: ["A/B testing", "experimentation", "decision making", "statistics"]
draft: true
---
```

Set `draft: false` or remove the `draft` field when ready to publish.

## Blog post ideas

Some ideas to get started:

- Before asking who won: the commercial pitfalls of A/B testing
- The cost of waiting for certainty
- Peeking is inevitable, so design for it
- The metric can win while the business loses
- Sample ratio mismatch: before asking who won, check whether the test was broken
- Outcome maturity: not every quote has had time to convert
- Bayesian does not remove judgement
- A prior is not truth, it is a bet about the past

## Snippets page

Snippets live in:

```text
src/pages/snippets.astro
```

Snippets are stored as strings in the frontmatter to avoid Astro parsing issues with braces and code syntax. Use Astro's `Code` component for syntax highlighting where appropriate.

## Static assets

Static files (images, PDFs) live in the `public/` directory and are served from the site root. Examples:

```text
public/images/home-banner.png
public/images/site-mark.png
public/cv/shan-islam-cv.pdf
```

These are referenced by their root paths. For example, `public/images/home-banner.png` becomes `/images/home-banner.png`.

## CV page

Place the CV PDF at:

```text
public/cv/shan-islam-cv.pdf
```

And link to it from the CV page as:

```text
/cv/shan-islam-cv.pdf
```

## Deploying

Typical deploy flow:

```bash
npm run build
git status
git add .
git commit -m "Update site"
git push
```

Netlify automatically deploys from the GitHub repository after pushing. Recommended Netlify settings:

```
Build command: npm run build
Publish directory: dist
```

## Domain notes

The live domain is:

```text
www.shanislam.com
```

The bare domain `shanislam.com` should redirect to `www.shanislam.com`.

DNS is managed in Namecheap and points to Netlify.

Example DNS pattern:

```text
ALIAS @    apex-loadbalancer.netlify.com
CNAME www  [current-netlify-site].netlify.app
```

Do not hardcode the Netlify subdomain here unless it's obvious in the project.

## Design principle

Commercial decision first. Statistics make the risk visible.

Keep the site calm, readable and writing focused. Do not redesign the site when the goal is to publish a post.

