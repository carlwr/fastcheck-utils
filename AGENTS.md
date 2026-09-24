_This file is `AGENTS.md`. `CLAUDE.md` is a symlink pointing to this file._

## README.md and JSDoc comments...

...is and remains the voice of the human maintainer.

Agents _may not_:
- edit the prose
- suggest changes to the prose
- suggest prose to add
- inform about grammatic errors or non-idiomatic phrasing

Agents _may_:
- correct typos
- correct single words, including mentioned identifiers
- adjust styling markup
- adjust html code, badges and links
- _inform_ about missing information, things that might be unclear or wrong (but not suggest phrasing that corrects or clarifies it)
- if asked by the user, provide terse, non-prose _information_ as a suggestion of something the human user can use to write prose, e.g. for a JSDoc string; such non-prose information can e.g. be in the form of a bullet list with only incomplete sentences

Agents are not prohibited to write or change code comments (only JSDoc code comments).

## Guidelines

- less code comments, less .md text
- conciseness (code comments, .md text - where it cannot be avoided or it does add true value)
- functional
- typesafe
