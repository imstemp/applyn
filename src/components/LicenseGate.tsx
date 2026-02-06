import { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import AppRouter from '../router';
import Activate from '../pages/Activate';

declare global {
  interface Window {
    electronAPI?: {
      license: { get: () => Promise<string | null> };
    };
  }
}

export default function LicenseGate() {
  const [licensed, setLicensed] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      if (!window.electronAPI?.license) {
        setLicensed(true);
        return;
      }
      const key = await window.electronAPI.license.get();
      setLicensed(!!key);
    }
    check();
  }, []);

  if (licensed === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!licensed) {
    return <Activate onActivated={() => setLicensed(true)} />;
  }

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppRouter />
    </HashRouter>
  );
}
