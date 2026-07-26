'use client';

import { useEffect, useState } from 'react';

import loader from '@willbooster/monaco-loader';

export default function FallbackEditorAssetsProbe() {
  const [status, setStatus] = useState('fallback-editor-assets-pending');

  useEffect(() => {
    let active = true;

    loader.config({
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs' },
      fallbackPaths: [{ vs: 'https://unpkg.com/monaco-editor@0.56.0/min/vs' }],
    });
    loader
      .init()
      .then((monaco) => {
        if (active) {
          setStatus(monaco.editor ? 'fallback-editor-assets-ok' : 'fallback-editor-assets-mismatch');
        }
        return;
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : 'fallback-editor-assets-error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return <p data-testid="fallback-editor-assets">{status}</p>;
}
