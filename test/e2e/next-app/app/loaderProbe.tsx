'use client';

import { useEffect, useState } from 'react';

import loader, { type Monaco } from '@willbooster/monaco-loader';

const monaco = {
  editor: {
    create: () => ({
      dispose: () => {},
    }),
  },
} satisfies Monaco;

export default function LoaderProbe() {
  const [status, setStatus] = useState('client-init-pending');

  useEffect(() => {
    let active = true;

    loader.config({ monaco });
    loader
      .init()
      .then((loadedMonaco) => {
        if (active) {
          setStatus(loadedMonaco === monaco ? 'client-init-ok' : 'client-init-mismatch');
        }
        return;
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : 'client-init-error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return <p data-testid="client-init">{status}</p>;
}
