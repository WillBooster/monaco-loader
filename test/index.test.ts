import { describe, expect, test, vi } from 'vitest';

import loader from '../src/index.js';

const errorMessages = {
  configIsRequired: 'the configuration object is required',
  configType: 'the configuration object should be an object',
  deprecation: `Deprecation warning!
    You are using deprecated way of configuration.

    Instead of using
      monaco.config({ urls: { monacoBase: '...' } })
    use
      monaco.config({ paths: { vs: '...' } })

    For more please check the link https://github.com/WillBooster/monaco-loader#config
  `,
};

describe('.config', () => {
  test('should be a function', () => {
    expect(loader.config).toBeInstanceOf(Function);
  });

  test('should throw an error when no arguments are passed', () => {
    function callConfigWithoutArguments(): void {
      const config = loader.config as (value?: unknown) => void;
      config();
    }

    expect(callConfigWithoutArguments).toThrow(errorMessages.configIsRequired);
  });

  test('should throw an error when undefined is passed', () => {
    function callConfigWithUndefined(): void {
      const config = loader.config as (value: unknown) => void;
      config(undefined);
    }

    expect(callConfigWithUndefined).toThrow(errorMessages.configIsRequired);
  });

  test('should throw an error when the first argument is not an object', () => {
    function callConfigWithNonObjectFirstArgument(config: unknown): () => void {
      const configure = loader.config as (value: unknown) => void;
      return () => configure(config);
    }

    expect(callConfigWithNonObjectFirstArgument('string')).toThrow(errorMessages.configType);
    expect(callConfigWithNonObjectFirstArgument([1, 2, 3])).toThrow(errorMessages.configType);
    expect(callConfigWithNonObjectFirstArgument((x: number) => x + 1)).toThrow(errorMessages.configType);
  });

  test('should warn about deprecation', () => {
    const consoleWarnSpy = vi.spyOn(globalThis.console, 'warn').mockImplementation(() => {});
    const configure = loader.config as (value: unknown) => void;

    configure({ urls: { monacoBase: 'https://example.com/vs' } });

    expect(consoleWarnSpy).toHaveBeenCalledWith(errorMessages.deprecation);
    consoleWarnSpy.mockRestore();
  });
});

describe('.init', () => {
  test('should be a function', () => {
    expect(loader.init).toBeInstanceOf(Function);
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
