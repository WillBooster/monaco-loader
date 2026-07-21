// wbfy:start oxlint-base
import type { OxlintConfig } from 'oxlint';

import oxlintBaseConfig from '@willbooster/oxlint-config';

// Keep a package-local copy so repositories can add settings outside
// managed blocks without mutating the shared imported config object.
const oxlintResolvedConfig: OxlintConfig = structuredClone(oxlintBaseConfig);
// The type-aware options make lint perform type checking. Always force them on here,
// inside the managed block, so no customization can silently disable type checking.
oxlintResolvedConfig.options = { ...oxlintResolvedConfig.options, typeAware: true, typeCheck: true };
// wbfy:end oxlint-base

// The Next.js fixture under test/e2e/ is an app, not test code: its route components do not
// annotate return types. The shared config enforces explicit-function-return-type on test/**,
// so exempt the fixture to keep the behavior it had under the pre-convention e2e/ layout.
oxlintResolvedConfig.overrides = [
  ...(oxlintResolvedConfig.overrides ?? []),
  {
    files: ['test/e2e/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
];

// wbfy:start oxlint-export
export default oxlintResolvedConfig;
// wbfy:end oxlint-export
