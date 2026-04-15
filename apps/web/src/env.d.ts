/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// YAML module declarations for @rollup/plugin-yaml
declare module '*.yaml' {
  const value: unknown;
  export default value;
}

declare module '*.yml' {
  const value: unknown;
  export default value;
}
