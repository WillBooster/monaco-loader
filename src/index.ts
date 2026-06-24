import type * as MonacoEditor from 'monaco-editor';

export type Monaco = typeof MonacoEditor;
export type MonacoEnvironment = MonacoEditor.Environment;

export interface LoaderConfig {
  paths?: {
    vs?: string;
  };
  fallbackPaths?: {
    vs?: string;
  }[];
  monacoEnvironment?: MonacoEnvironment;
  'vs/nls'?: {
    availableLanguages?: Record<string, unknown>;
  };
  monaco?: Monaco;
}

type MonacoRequireConfig = Omit<LoaderConfig, 'fallbackPaths' | 'monaco' | 'monacoEnvironment'>;

export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

interface MonacoRequire {
  config: (config: MonacoRequireConfig) => void;
  reset?: () => void;
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

    if (monacoInstance) {
      resolveMonaco?.(monacoInstance);
      return makeCancelable(wrapperPromise);
    }

    if (globalThis.monaco?.editor) {
      storeMonacoInstance(globalThis.monaco);
      resolveMonaco?.(globalThis.monaco);
      return makeCancelable(wrapperPromise);
    }

    loadMonaco(0);
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

function isMonacoRequire(value: unknown): value is MonacoRequire {
  return typeof value === 'function' && typeof (value as { config?: unknown }).config === 'function';
}

function loadMonaco(vsBaseUrlIndex: number, lastError?: unknown): void {
  applyMonacoEnvironment();

  const vsBaseUrls = getVsBaseUrls();
  const vsBaseUrl = vsBaseUrls[vsBaseUrlIndex];
  if (!vsBaseUrl) {
    initialized = false;
    rejectMonaco?.(normalizeLoadError(lastError ?? new Error('No monaco editor asset base URL is configured')));
    return;
  }

  if (isMonacoRequire(globalThis.require)) {
    configureLoader(vsBaseUrl, vsBaseUrlIndex > 0, (error) => loadMonaco(vsBaseUrlIndex + 1, error));
    return;
  }

  injectScript(
    getMonacoLoaderScript(
      vsBaseUrl,
      () => configureLoader(vsBaseUrl, false, (error) => loadMonaco(vsBaseUrlIndex + 1, error)),
      (error) => loadMonaco(vsBaseUrlIndex + 1, error)
    )
  );
}

function getVsBaseUrls(): string[] {
  return [currentConfig.paths?.vs, ...(currentConfig.fallbackPaths ?? []).map((paths) => paths.vs)].filter(
    (vsBaseUrl, index, vsBaseUrls): vsBaseUrl is string =>
      typeof vsBaseUrl === 'string' && vsBaseUrl.length > 0 && vsBaseUrls.indexOf(vsBaseUrl) === index
  );
}

function configureLoader(vsBaseUrl: string, resetLoader: boolean, retry: (error: unknown) => void): void {
  const monacoRequire = globalThis.require;
  if (!isMonacoRequire(monacoRequire)) {
    retry(new Error('monaco loader was not initialized'));
    return;
  }

  try {
    if (resetLoader) {
      monacoRequire.reset?.();
    }
    monacoRequire.config(createRequireConfig(vsBaseUrl));
    monacoRequire(
      ['vs/editor/editor.main'],
      (loaded) => {
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
  return {
    'vs/nls': currentConfig['vs/nls'],
    paths: {
      ...currentConfig.paths,
      vs: vsBaseUrl,
    },
  };
}

function applyMonacoEnvironment(): void {
  if (!currentConfig.monacoEnvironment) return;

  globalThis.MonacoEnvironment = {
    ...globalThis.MonacoEnvironment,
    ...currentConfig.monacoEnvironment,
  };
}

function normalizeLoadError(error: unknown): Error {
  if (error instanceof Error) return error;
  const normalizedError = new Error(String(error));
  if (isObject(error)) {
    for (const [key, value] of Object.entries(error)) {
      Object.defineProperty(normalizedError, key, {
        value,
        enumerable: true,
        configurable: true,
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
