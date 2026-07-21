import os from 'node:os';
import path from 'node:path';

// Bun's isolated install with the global store symlinks node_modules into ~/.bun, which Turbopack
// rejects unless its root encloses the store. Use the common ancestor of the project and the home
// directory (the home dir locally, `/` in Docker builds).
function commonAncestor(a, b) {
  const aParts = a.split(path.sep);
  const bParts = b.split(path.sep);
  const shared = [];
  for (let i = 0; i < Math.min(aParts.length, bParts.length) && aParts[i] === bParts[i]; i++) {
    shared.push(aParts[i]);
  }
  return shared.join(path.sep) || path.sep;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repo pins the native TypeScript 7 preview, whose package does not expose the classic
  // compiler API Next's default in-build type check requires (it would otherwise try to npm-install
  // a classic typescript, which fails on bun's isolated node_modules). Run the TypeScript CLI (tsgo)
  // instead — supported since Next 16.3 — so the fixture is type-checked natively during the build.
  experimental: { useTypeScriptCli: true },
  turbopack: {
    root: commonAncestor(process.cwd(), os.homedir()),
  },
};

export default nextConfig;
