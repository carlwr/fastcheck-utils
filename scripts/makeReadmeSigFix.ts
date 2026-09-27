import { type Application, Converter } from 'typedoc';
import ts from 'typescript';

/* workaround: TypeDoc (<=0.28.20) derives signature types from the checker, not the source, e.g.:
  - `readonly [T, ...T[]]` -> `readonly [T, T]`
  - `K extends keyof T`    -> `K extends string | number | symbol`
- fix: re-convert from the declaration's type nodes
- after a TypeDoc bump: check if still needed (disable, diff README.md)
*/

export function useDeclaredSignatureTypes(app: Application): void {
  app.converter.on(Converter.EVENT_CREATE_SIGNATURE, (ctx, sig, decl) => {
    if (!decl || !ts.isFunctionDeclaration(decl)) return
    const scope = ctx.withScope(sig)
    const conv  = (node: ts.TypeNode) => ctx.converter.convertType(scope, node)

    decl.typeParameters?.forEach((p, i) => {
      const refl = sig.typeParameters?.[i]
      if (refl && p.constraint) refl.type = conv(p.constraint)
    })
    decl.parameters.forEach((p, i) => {
      const refl = sig.parameters?.[i]
      if (refl && p.type) refl.type = conv(p.type)
    })
    if (decl.type) sig.type = conv(decl.type)
  })
}
