/* type-level tests: checked by tsc (`pnpm typecheck`), not run by vitest */

import type { Assert, Eq } from '@carlwr/typescript-extra'
import { type Coverage, coverage } from '../src/index.js'

interface Named { covered: number }
declare const named: Named

const _inferred = () => ({
  named  : coverage(named),
  single : coverage({a: 1}),
  two    : coverage({a: 1, b: 2}),
  numeric: coverage({0: 1, b: 2}),
})
type Inferred = ReturnType<typeof _inferred>

type _named   = Assert<Eq<Inferred['named'  ], Coverage<'covered'>>>
type _single  = Assert<Eq<Inferred['single' ], Coverage<'a'>      >>
type _two     = Assert<Eq<Inferred['two'    ], Coverage<'a'|'b'>  >>
// known limitation: a numeric key widens labels to string;
// unknown labels are then caught at runtime
type _numeric = Assert<Eq<Inferred['numeric'], Coverage<string>   >>

// never called; only type-checked:
function _rejects({hit}: Coverage<'a'>): void {
  // @ts-expect-error: unknown label
  hit('b')
  // @ts-expect-error: non-numeric percentage
  coverage({a: '1'})
}
