## Development

```bash

# clone the repo:
git clone carlwr/fastcheck-utils
cd fastcheck-utils

# install dependencies:
pnpm install

# run checks + tests:
pnpm qa

```

### JSDoc links

- identifier: `{@linkcode getNext}`, `{@linkcode Coverage.hit | hit()}`, `{@linkcode fc.record}`
  - `@linkcode` -> rendered as code; `@link` -> plain text
- URL: `{@link https://… | text}`
- no markup in link text (escaped in `README.md`)
- 3rd-party symbols (`fc.*`): `@linkcode` too; resolved by TypeScript, but npm packages carry no symbol -> doc URL metadata
  - IDE, `README.md`: code; IDE navigates to `.d.ts`
  - TypeDoc HTML: plain text (would need per-symbol URL mappings; deliberately not maintained)
- after `pnpm readme`: check `README.md` - links must render as links or at least as \`code\`

To check generated docs; links not resolved -> warnings, rendered links -> `<a href`:

```bash
out=$(mktemp -d)
npx typedoc --entryPoints src/index.ts --out "$out" --validation.invalidLink
# -> read "$out/index.html"
```
