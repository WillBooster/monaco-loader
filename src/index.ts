import type * as MonacoEditor from 'monaco-editor';

export type Monaco = typeof MonacoEditor;

export interface LoaderConfig {
  paths?: {
    vs?: string;
  };
  'vs/nls'?: {
    availableLanguages?: Record<string, unknown>;
  };
  monaco?: Monaco;
}

export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

interface MonacoRequire {
  config: (config: LoaderConfig) => void;
  (
    dependencies: ['vs/editor/editor.main'],
    onSuccess: (loaded: Monaco) => void,
    onError: (error: unknown) => void
  ): void;
}

declare global {
  var monaco: Monaco | undefined;
  var require: MonacoRequire | undefined;
}

const errorMessages = {
  configIsRequired: 'the configuration object is required',
  configType: 'the configuration object should be an object',
  default: 'an unknown error occurred in `@willbooster/monaco-loader` package',
} as const;

const cancelationMessage = {
  type: 'cancelation',
  msg: 'operation is manually canceled',
};

const defaultConfig = {
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs',
  },
} satisfies LoaderConfig;

let currentConfig: LoaderConfig = defaultConfig;
let initialized = false;
let monacoInstance: Monaco | undefined;
let resolveMonaco: ((monaco: Monaco) => void) | undefined;
let rejectMonaco: ((error: unknown) => void) | undefined;

const wrapperPromise = new Promise<Monaco>((resolve, reject) => {
  resolveMonaco = resolve;
  rejectMonaco = reject;
});

const loader = {
  config: configure,
  init,
  __getMonacoInstance,
};

export default loader;

function configure(globalConfig: LoaderConfig): void {
  const { monaco, ...config } = validateConfig(globalConfig);

  currentConfig = mergeConfig(currentConfig, config);
  if (monaco !== undefined) {
    monacoInstance = monaco;
  }
}

function init(): CancelablePromise<Monaco> {
  if (!initialized) {
    initialized = true;

    if (monacoInstance) {
      resolveMonaco?.(monacoInstance);
      return makeCancelable(wrapperPromise);
    }

    if (globalThis.monaco?.editor) {
      storeMonacoInstance(globalThis.monaco);
      resolveMonaco?.(globalThis.monaco);
      return makeCancelable(wrapperPromise);
    }

    injectScript(getMonacoLoaderScript(configureLoader));
  }

  return makeCancelable(wrapperPromise);
}

function __getMonacoInstance(): Monaco | undefined {
  return monacoInstance;
}

function validateConfig(config: unknown): LoaderConfig {
  if (!config) {
    throwError('configIsRequired');
  }
  if (!isObject(config)) {
    throwError('configType');
  }

  return config as LoaderConfig;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function throwError(type: keyof typeof errorMessages): never {
  throw new Error(errorMessages[type] || errorMessages.default);
}

function mergeConfig(target: LoaderConfig, source: LoaderConfig): LoaderConfig {
  const config = {
    ...target,
    ...source,
  };

  if (source.paths) {
    config.paths = {
      ...target.paths,
      ...source.paths,
    };
  }

  if (source['vs/nls']) {
    config['vs/nls'] = {
      ...target['vs/nls'],
      ...source['vs/nls'],
    };
  }

  return config;
}

function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let canceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((value) => {
        if (canceled) {
          reject(cancelationMessage);
          return;
        }
        return resolve(value);
      })
      .catch(reject);
  }) as CancelablePromise<T>;

  wrappedPromise.cancel = () => {
    canceled = true;
  };

  return wrappedPromise;
}

function injectScript(script: HTMLScriptElement): void {
  (document.body || document.head || document.documentElement).append(script);
}

function createScript(src: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = src;
  return script;
}

function getMonacoLoaderScript(configureLoader: () => void): HTMLScriptElement {
  const loaderScript = createScript(`${currentConfig.paths?.vs}/loader.js`);
  loaderScript.addEventListener('load', configureLoader);
  loaderScript.addEventListener('error', () =>
    rejectMonaco?.(new Error(`Failed to load monaco loader script from ${loaderScript.src}`))
  );

  return loaderScript;
}

function isMonacoRequire(value: unknown): value is MonacoRequire {
  return typeof value === 'function' && typeof (value as { config?: unknown }).config === 'function';
}

function configureLoader(): void {
  const monacoRequire = globalThis.require;
  if (!isMonacoRequire(monacoRequire)) {
    rejectMonaco?.(new Error('monaco loader was not initialized'));
    return;
  }

  try {
    monacoRequire.config(currentConfig);
    monacoRequire(
      ['vs/editor/editor.main'],
      (loaded) => {
        storeMonacoInstance(loaded);
        resolveMonaco?.(loaded);
      },
      (error) => rejectMonaco?.(error)
    );
  } catch (error) {
    rejectMonaco?.(error);
  }
}

function storeMonacoInstance(monaco: Monaco): void {
  monacoInstance ??= monaco;
}
