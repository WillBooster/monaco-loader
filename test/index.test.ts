import { afterEach, describe, expect, test, vi } from 'vitest';

import loader from '../src/index.js';
import type { LoaderConfig, Monaco } from '../src/index.js';

const errorMessages = {
  configIsRequired: 'the configuration object is required',
  configType: 'the configuration object should be an object',
};

const monaco = {
  editor: {
    create: () => ({
      dispose: () => {},
    }),
  },
} as unknown as Monaco;

async function importFreshLoader(): Promise<typeof loader> {
  vi.resetModules();
  const module = await import('../src/index.js');
  return module.default;
}

function callConfigWithoutArguments(): void {
  const config = loader.config as (value?: unknown) => void;
  config();
}

function callConfigWithUndefined(): void {
  const config = loader.config as (value: unknown) => void;
  config(undefined);
}

function callConfigWithNonObjectFirstArgument(config: unknown): () => void {
  const configure = loader.config as (value: unknown) => void;
  return () => configure(config);
}

describe('.config', () => {
  test('should be a function', () => {
    expect(loader.config).toBeInstanceOf(Function);
  });

  test('should throw an error when no arguments are passed', () => {
    expect(callConfigWithoutArguments).toThrow(errorMessages.configIsRequired);
  });

  test('should throw an error when undefined is passed', () => {
    expect(callConfigWithUndefined).toThrow(errorMessages.configIsRequired);
  });

  test('should throw an error when the first argument is not an object', () => {
    expect(callConfigWithNonObjectFirstArgument('string')).toThrow(errorMessages.configType);
    expect(callConfigWithNonObjectFirstArgument([1, 2, 3])).toThrow(errorMessages.configType);
    expect(callConfigWithNonObjectFirstArgument((x: number) => x + 1)).toThrow(errorMessages.configType);
  });
});

describe('.init', () => {
  afterEach(() => {
    globalThis.require = undefined;
    globalThis.monaco = undefined;
  });

  test('should be a function', () => {
    expect(loader.init).toBeInstanceOf(Function);
  });

  test('passes through Monaco AMD config options while ignoring invalid fallback entries', async () => {
    const freshLoader = await importFreshLoader();
    const requireConfig = vi.fn();
    const monacoRequire = Object.assign(
      (_dependencies: ['vs/editor/editor.main'], onSuccess: (loaded: Monaco) => void) => onSuccess(monaco),
      {
        config: requireConfig,
        reset: vi.fn(),
      }
    );

    globalThis.require = monacoRequire;
    freshLoader.config({
      cspNonce: 'nonce-value',
      fallbackPaths: [undefined, { vs: 'https://example.com/fallback/vs' }],
      paths: { vs: 'https://example.com/primary/vs' },
      urlArgs: 'v=1',
    } as LoaderConfig & { cspNonce: string; urlArgs: string });

    await freshLoader.init();

    expect(requireConfig).toHaveBeenCalledWith({
      cspNonce: 'nonce-value',
      paths: { vs: 'https://example.com/primary/vs' },
      urlArgs: 'v=1',
    });
  });

  test('preserves writable diagnostic fields from non-plain load errors', async () => {
    const freshLoader = await importFreshLoader();
    const loadError = Object.create({ [Symbol.toStringTag]: 'Error' }) as { requireType: string };
    Object.defineProperty(loadError, 'message', { value: 'cross realm load failed' });
    Object.defineProperty(loadError, 'stack', { value: 'Error: cross realm load failed\n    at test' });
    loadError.requireType = 'scripterror';
    const monacoRequire = Object.assign(
      (
        _dependencies: ['vs/editor/editor.main'],
        _onSuccess: (loaded: Monaco) => void,
        onError: (error: unknown) => void
      ) => onError(loadError),
      {
        config: vi.fn(),
        reset: vi.fn(),
      }
    );

    globalThis.require = monacoRequire;
    freshLoader.config({ paths: { vs: 'https://example.com/primary/vs' } });

    try {
      await freshLoader.init();
      throw new Error('expected loader init to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('cross realm load failed');
      expect((error as Error).stack).toBe('Error: cross realm load failed\n    at test');
      expect(error).toMatchObject({ requireType: 'scripterror' });
      (error as Error & { requireType: string }).requireType = 'updated';
      expect(error).toMatchObject({ requireType: 'updated' });
    }
  });
});

describe('.__getMonacoInstance', () => {
  test('should be a function', () => {
    expect(loader.__getMonacoInstance).toBeInstanceOf(Function);
  });

  test('should return undefined', () => {
    expect(loader.__getMonacoInstance()).toBe(undefined);
  });
});
