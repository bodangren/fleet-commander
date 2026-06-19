# TypeScript Style Guide

Fleet Commander uses TypeScript with the repo's ESLint and Prettier configuration. Match existing local style before importing generic rules.

## 1. Language Features
- **Variable Declarations:** Always use `const` or `let`. **`var` is forbidden.** Use `const` by default.
- **Modules:** Use ES6 modules (`import`/`export`). **Do not use `namespace`.**
- **Exports:** Prefer named exports. Keep existing default-export component boundaries when the surrounding file already uses that pattern.
- **Classes:**
  - **Do not use `#private` fields.** Use TypeScript's `private` visibility modifier.
  - Mark properties never reassigned outside the constructor with `readonly`.
  - **Never use the `public` modifier** (it's the default). Restrict visibility with `private` or `protected` where possible.
- **Functions:** Prefer function declarations for named functions. Use arrow functions for anonymous functions/callbacks.
- **String Literals:** Use single quotes (`'`). Use template literals (`` ` ``) for interpolation and multi-line strings.
- **Equality Checks:** Always use triple equals (`===`) and not equals (`!==`).
- **Type Assertions:** **Avoid type assertions (`x as SomeType`) and non-nullability assertions (`y!`)**. If you must use them, provide a clear justification.

## 2. Disallowed Features
- **`any` Type:** **Avoid `any`**. Prefer `unknown` or a more specific type.
- **Wrapper Objects:** Do not instantiate `String`, `Boolean`, or `Number` wrapper classes.
- **Automatic Semicolon Insertion (ASI):** Follow the formatter in the edited package. Pivot code uses semicolons; frontend code generally omits them.
- **`const enum`:** Do not use `const enum`. Use plain `enum` instead.
- **`eval()` and `Function(...string)`:** Forbidden.

## 3. Naming
- **`UpperCamelCase`:** For classes, interfaces, types, enums, and decorators.
- **`lowerCamelCase`:** For variables, parameters, functions, methods, and properties.
- **`CONSTANT_CASE`:** For global constant values, including enum values.
- **`_` Prefix/Suffix:** **Do not use `_` as a prefix or suffix** for identifiers, including for private properties.

## 4. Type System
- **Type Inference:** Rely on type inference for simple, obvious types. Be explicit for complex types.
- **`undefined` and `null`:** Both are supported. Be consistent within your project.
- **Optional vs. `|undefined`:** Prefer optional parameters and fields (`?`) over adding `|undefined` to the type.
- **`Array<T>` Type:** Use `T[]` for simple types. Use `Array<T>` for more complex union types (e.g., `Array<string | number>`).
- **`{}` Type:** **Do not use `{}`**. Prefer `unknown`, `Record<string, unknown>`, or `object`.

## 5. Comments and Documentation
- **JSDoc:** Use `/** JSDoc */` for documentation, `//` for implementation comments.
- **Redundancy:** **Do not declare types in `@param` or `@return` blocks** (e.g., `/** @param {string} user */`). This is redundant in TypeScript.
- **Add Information:** Comments must add information, not just restate the code.

Project override: exported functions require JSDoc that describes params and returns without repeating TypeScript types.
