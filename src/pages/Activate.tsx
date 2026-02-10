import { useState } from 'react';

/** Replace with your Gumroad product URL, e.g. https://yoursite.gumroad.com/l/product */
const GUMROAD_BUY_URL = 'https://tpm.gumroad.com/l/applyn?wanted=true';

declare global {
  interface Window {
    electronAPI?: {
      license: {
        get: () => Promise<string | null>;
        verify: (key: string) => Promise<{ success: boolean; error?: string }>;
        clear: () => Promise<boolean>;
      };
    };
  }
}

interface ActivateProps {
  onActivated: () => void;
}

export default function Activate({ onActivated }: ActivateProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleVerify = async () => {
    const key = licenseKey.trim();
    if (!key) {
      setMessage({ type: 'error', text: 'Please enter your license key.' });
      return;
    }
    if (!window.electronAPI?.license) {
      setMessage({ type: 'error', text: 'License activation is only available in the desktop app.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.license.verify(key);
      if (result.success) {
        setMessage({ type: 'success', text: 'License activated! Opening app...' });
        onActivated();
      } else {
        setMessage({ type: 'error', text: result.error || 'Invalid license key.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Activation failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-8 text-white text-center">
            <h1 className="text-2xl font-bold">Activate applyn</h1>
            <p className="text-blue-50 mt-2 text-sm">
              Enter the license key you received after purchase.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="licenseKey" className="block text-sm font-medium text-slate-700 mb-2">
                License key
              </label>
              <input
                id="licenseKey"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                autoFocus
              />
            </div>
            {message && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Activate'}
            </button>
            <p className="text-center text-sm text-slate-600">
              Don&apos;t have a license?{' '}
              <a
                href={GUMROAD_BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Buy on Gumroad — $29
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
