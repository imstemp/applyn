import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

interface Config {
  anthropicApiKey?: string;
  anthropicApiKeyEncrypted?: string;
  licenseKey?: string;
}

function getConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      
      // Decrypt API key if it exists and safeStorage is available
      if (config.anthropicApiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(config.anthropicApiKeyEncrypted, 'base64');
          config.anthropicApiKey = safeStorage.decryptString(buffer);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
        }
      }
      
      return config;
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return {};
}

export function getAnthropicKey(): string | null {
  const config = getConfig();
  return config.anthropicApiKey || null;
}

export function setAnthropicKey(apiKey: string): boolean {
  try {
    const config = getConfig();
    
    // Encrypt the API key if safeStorage is available
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey);
      config.anthropicApiKeyEncrypted = encrypted.toString('base64');
      delete config.anthropicApiKey; // Don't store plain text
    } else {
      // Fallback to plain text if encryption is not available
      config.anthropicApiKey = apiKey;
    }
    
    // Ensure directory exists
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

export function getLicenseKey(): string | null {
  const config = getConfig();
  return config.licenseKey?.trim() || null;
}

export function setLicenseKey(licenseKey: string): boolean {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    let raw: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_FILE)) {
      raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    raw.licenseKey = licenseKey.trim();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(raw, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving license key:', error);
    return false;
  }
}

export function clearLicenseKey(): boolean {
  return setLicenseKey('');
}
