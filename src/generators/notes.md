Notes about shrinking behaviour on failure for other fc.* generators:

- `fc.constantFrom`
  - only attempts the first element
- `fc.oneof`
  - only attempts the first element (if `withCrossShrink` is set to `true`, otherwise attempts no other elements)
