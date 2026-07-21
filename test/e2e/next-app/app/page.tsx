import loader from '@willbooster/monaco-loader';

import LoaderProbe from './loaderProbe';

export default function Page() {
  const serverImportStatus = typeof loader.init === 'function' ? 'server-import-ok' : 'server-import-error';

  return (
    <main>
      <h1>Next.js integration</h1>
      <p data-testid="server-import">{serverImportStatus}</p>
      <LoaderProbe />
    </main>
  );
}
