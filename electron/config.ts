import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

interface Config {
  openaiApiKey?: string;
  openaiApiKeyEncrypted?: string;
}

function getConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      
      // Decrypt API key if it exists and safeStorage is available
      if (config.openaiApiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(config.openaiApiKeyEncrypted, 'base64');
          config.openaiApiKey = safeStorage.decryptString(buffer);
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

export function getOpenAIKey(): string | null {
  const config = getConfig();
  return config.openaiApiKey || null;
}

export function setOpenAIKey(apiKey: string): boolean {
  try {
    const config = getConfig();
    
    // Encrypt the API key if safeStorage is available
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey);
      config.openaiApiKeyEncrypted = encrypted.toString('base64');
      delete config.openaiApiKey; // Don't store plain text
    } else {
      // Fallback to plain text if encryption is not available
      config.openaiApiKey = apiKey;
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

