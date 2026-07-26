'use client';

import { useEffect, useState } from 'react';

import loader from '@willbooster/monaco-loader';

export default function FallbackLoaderProbe() {
  const [status, setStatus] = useState('fallback-init-pending');

  useEffect(() => {
    let active = true;

    loader.config({
      paths: { vs: '/missing-monaco-assets' },
      fallbackPaths: [{ vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs' }],
    });
    loader
      .init()
      .then((monaco) => {
        if (active) {
          setStatus(monaco.editor ? 'fallback-init-ok' : 'fallback-init-mismatch');
        }
        return;
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : 'fallback-init-error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return <p data-testid="fallback-init">{status}</p>;
}
