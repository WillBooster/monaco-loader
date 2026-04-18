declare module '@willbooster/monaco-loader' {
  export interface Monaco {
    editor?: unknown;
    [key: string]: unknown;
  }

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

  const loader: {
    config: (globalConfig: LoaderConfig) => void;
    init: () => CancelablePromise<Monaco>;
    __getMonacoInstance: () => Monaco | undefined;
  };

  export default loader;
}
