import * as pkg from "./pkgJson.js";

const preamble =  `
# ${pkg.name}

_improved generators for [fast-check](https://github.com/dubzzz/fast-check)_

Links:
* github: ${linkify(pkg.repoUrl)}
* npm: ${linkify(pkg.npmUrl)}

## Installation

\`\`\`bash
npm install ${pkg.pkgJson.name}
\`\`\`

\`fast-check\` is a peer dependency of this package. It should be picked up by the package manager also if you depend on e.g. \`@fast-check/vitest\` or \`@fast-check/jest\` rather than on \`fast-check\` directly.

to run checks and tests:
\`\`\`bash
npm qa
\`\`\`

---

## Generators
`

export default preamble

// to md link; link text: remove https?://
function linkify(url: string): string {
  const linkText = url.replace(/^https?:\/\//, '')
  return `[${linkText}](${url})`
}
