# Upload and validate

Copy these files into the repository root:

```text
app/layout.js
app/page.js
app/globals.css
next.config.mjs
```

Then validate in Codespace:

```bash
npm run build
npm test
git status
```

If both build and test pass:

```bash
git add package.json package-lock.json next.config.mjs app
git commit -m "fix: add deployable Next.js app shell"
git push
```

Vercel should no longer fail with:

```text
No Next.js version detected
```
