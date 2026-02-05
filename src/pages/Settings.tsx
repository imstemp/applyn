import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";

declare global {
  interface Window {
    electronAPI: {
      getOpenAIKey: () => Promise<string | null>;
      setOpenAIKey: (key: string) => Promise<boolean>;
    };
  }
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const key = await window.electronAPI.getOpenAIKey();
      if (key) {
        setApiKey(key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'API key cannot be empty' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await window.electronAPI.setOpenAIKey(apiKey.trim());
      if (success) {
        setMessage({ type: 'success', text: 'API key saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving API key' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-blue-50 text-lg">
            Configure your OpenAI API key to enable AI-powered features.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">OpenAI API Configuration</h2>
            <p className="text-sm text-slate-700 mt-1">
              Your API key is stored securely and encrypted on your device
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-slate-700">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>

            {message && (
              <div
                className={`p-4 rounded-xl ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save API Key'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


