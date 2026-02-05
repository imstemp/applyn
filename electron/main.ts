import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getAnthropicKey, setAnthropicKey } from './config';
import { initializeDatabase, closeDatabase } from './db';
import { setDatabase, setMainWindow } from './ipc-handlers';

// Disable proxy server detection
app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

let mainWindow: BrowserWindow | null = null;


function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, files are packaged in app.asar
    // __dirname points to dist-electron/electron/ in the asar
    // dist/index.html is at the root of the asar
    // So we need to go up from electron/ to the asar root, then into dist
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    
    if (mainWindow) {
      // Use loadFile which properly handles relative paths for assets
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error('Failed to load index.html with loadFile:', error);
        // Fallback: try with loadURL using file:// protocol
        const fileUrl = `file://${indexPath}`;
        console.log('Trying loadURL with:', fileUrl);
        if (mainWindow) {
          mainWindow.loadURL(fileUrl).catch((urlError) => {
            console.error('loadURL also failed:', urlError);
            // Try alternative path
            const altPath = path.join(__dirname, '..', 'dist', 'index.html');
            if (mainWindow) {
              mainWindow.loadFile(altPath).catch((altError) => {
                console.error('All loading methods failed:', altError);
              });
            }
          });
        }
      });
    }
    
    // Log any errors from the renderer process
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', { errorCode, errorDescription, validatedURL });
    });
    
    // Log console errors from renderer
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) { // Only log errors and warnings
        console.log(`[Renderer ${level}]:`, message, `at ${sourceId}:${line}`);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Set main window for IPC handlers
  setMainWindow(mainWindow);
}

app.whenReady().then(() => {
  // Create window immediately - show it right away
  // Don't wait for database or anything else
  createWindow();
  
  // Initialize database lazily in background (only when first IPC call needs it)
  // The database will be initialized on first use via getDatabase() in ipc-handlers
  // This prevents blocking the window from showing
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Config IPC handlers
ipcMain.handle('config:getAnthropicKey', () => {
  return getAnthropicKey();
});

ipcMain.handle('config:setAnthropicKey', async (_event, apiKey: string) => {
  return setAnthropicKey(apiKey);
});

// Import all other IPC handlers
import './ipc-handlers';
