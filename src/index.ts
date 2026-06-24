import type * as MonacoEditor from 'monaco-editor';

export type Monaco = typeof MonacoEditor;
export type MonacoEnvironment = MonacoEditor.Environment;

export interface LoaderConfig {
  paths?: {
    vs?: string;
  };
  fallbackPaths?: ({ vs?: string } | undefined)[];
  'vs/nls'?: {
    availableLanguages?: Record<string, unknown>;
  };
  monacoEnvironment?: MonacoEnvironment;
  monaco?: Monaco;
}

type MonacoRequireConfig = Omit<LoaderConfig, 'fallbackPaths' | 'monaco' | 'monacoEnvironment'>;

export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

interface MonacoRequire {
  config: (config: MonacoRequireConfig) => void;
  reset: () => void;
  (
    dependencies: ['vs/editor/editor.main'],
    onSuccess: (loaded: Monaco) => void,
    onError: (error: unknown) => void
  ): void;
}

declare global {
  var MonacoEnvironment: MonacoEnvironment | undefined;
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
let initializationAttemptId = 0;
let monacoInstance: Monaco | undefined;
let resolveMonaco: ((monaco: Monaco) => void) | undefined;
let rejectMonaco: ((error: unknown) => void) | undefined;
let wrapperPromise = createWrapperPromise();

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
    wrapperPromise = createWrapperPromise();
    const currentWrapperPromise = wrapperPromise;

    if (monacoInstance) {
      resolveMonaco?.(monacoInstance);
      return makeCancelable(currentWrapperPromise);
    }

    if (globalThis.monaco?.editor) {
      storeMonacoInstance(globalThis.monaco);
      resolveMonaco?.(globalThis.monaco);
      return makeCancelable(currentWrapperPromise);
    }

    const attemptId = ++initializationAttemptId;
    loadMonaco(attemptId, 0);
    return makeCancelable(currentWrapperPromise);
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

  if (source.monacoEnvironment) {
    config.monacoEnvironment = {
      ...target.monacoEnvironment,
      ...source.monacoEnvironment,
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

function getMonacoLoaderScript(
  vsBaseUrl: string,
  onLoad: () => void,
  onError: (error: unknown) => void
): HTMLScriptElement {
  const loaderScript = createScript(`${vsBaseUrl}/loader.js`);
  loaderScript.addEventListener('load', onLoad);
  loaderScript.addEventListener('error', () =>
    onError(new Error(`Failed to load monaco loader script from ${loaderScript.src}`))
  );

  return loaderScript;
}

function loadMonaco(attemptId: number, vsBaseUrlIndex: number, lastError?: unknown): void {
  if (attemptId !== initializationAttemptId) return;

  configureMonacoEnvironment();

  const vsBaseUrls = getVsBaseUrls();
  const vsBaseUrl = vsBaseUrls[vsBaseUrlIndex];
  if (!vsBaseUrl) {
    failInitialization(lastError ?? new Error('No monaco editor asset base URL is configured'), attemptId);
    return;
  }

  if (isMonacoRequire(globalThis.require)) {
    configureLoader(attemptId, vsBaseUrl, true, (error) => loadMonaco(attemptId, vsBaseUrlIndex + 1, error));
    return;
  }

  injectScript(
    getMonacoLoaderScript(
      vsBaseUrl,
      () => configureLoader(attemptId, vsBaseUrl, false, (error) => loadMonaco(attemptId, vsBaseUrlIndex + 1, error)),
      (error) => loadMonaco(attemptId, vsBaseUrlIndex + 1, error)
    )
  );
}

function getVsBaseUrls(): string[] {
  return [currentConfig.paths?.vs, ...(currentConfig.fallbackPaths ?? []).map((paths) => paths?.vs)].filter(
    (vsBaseUrl, index, vsBaseUrls): vsBaseUrl is string =>
      typeof vsBaseUrl === 'string' && vsBaseUrl.length > 0 && vsBaseUrls.indexOf(vsBaseUrl) === index
  );
}

function configureMonacoEnvironment(): void {
  if (!currentConfig.monacoEnvironment) return;

  globalThis.MonacoEnvironment = {
    ...globalThis.MonacoEnvironment,
    ...currentConfig.monacoEnvironment,
  };
}

function configureLoader(
  attemptId: number,
  vsBaseUrl: string,
  resetLoader: boolean,
  retry: (error: unknown) => void
): void {
  if (attemptId !== initializationAttemptId) return;

  const monacoRequire = globalThis.require;
  if (!isMonacoRequire(monacoRequire)) {
    retry(new Error('monaco loader was not initialized'));
    return;
  }

  try {
    if (resetLoader) {
      monacoRequire.reset();
    }
    monacoRequire.config(createRequireConfig(vsBaseUrl));
    monacoRequire(
      ['vs/editor/editor.main'],
      (loaded) => {
        if (attemptId !== initializationAttemptId) return;

        storeMonacoInstance(loaded);
        resolveMonaco?.(loaded);
      },
      retry
    );
  } catch (error) {
    retry(error);
  }
}

function createRequireConfig(vsBaseUrl: string): MonacoRequireConfig {
  const { fallbackPaths, monaco, monacoEnvironment, ...requireConfig } = currentConfig;
  void fallbackPaths;
  void monaco;
  void monacoEnvironment;

  return {
    ...requireConfig,
    paths: {
      ...currentConfig.paths,
      vs: vsBaseUrl,
    },
  };
}

function isMonacoRequire(value: unknown): value is MonacoRequire {
  return (
    typeof value === 'function' &&
    typeof (value as { config?: unknown }).config === 'function' &&
    typeof (value as { reset?: unknown }).reset === 'function'
  );
}

function failInitialization(error: unknown, attemptId: number): void {
  if (attemptId !== initializationAttemptId) return;

  initialized = false;
  rejectMonaco?.(normalizeLoadError(error));
  wrapperPromise = createWrapperPromise();
}

function normalizeLoadError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const normalizedError = new Error(message);
  if (typeof error === 'object' && error !== null) {
    if ('stack' in error) {
      normalizedError.stack = String((error as { stack: unknown }).stack);
    }
    for (const [key, value] of Object.entries(error)) {
      if (key === 'message' || key === 'stack') continue;
      Object.defineProperty(normalizedError, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return normalizedError;
}

function createWrapperPromise(): Promise<Monaco> {
  return new Promise<Monaco>((resolve, reject) => {
    resolveMonaco = resolve;
    rejectMonaco = reject;
  });
}

function storeMonacoInstance(monaco: Monaco): void {
  monacoInstance ??= monaco;
}
