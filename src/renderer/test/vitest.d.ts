/* eslint-disable @typescript-eslint/no-empty-object-type */
interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */
