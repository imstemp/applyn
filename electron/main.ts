import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { getAnthropicKey, setAnthropicKey, getLicenseKey, setLicenseKey, clearLicenseKey } from './config';
import { verifyLicense } from './gumroad';
import { closeDatabase } from './db';
import { setMainWindow } from './ipc-handlers';

// Disable proxy server detection
app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

// Disable auto-download (let user confirm first)
autoUpdater.autoDownload = false;

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

  // Custom app menu: View without Reload / Force Reload / Developer Tools (feels like an app, not a browser)
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom', accelerator: 'CommandOrControl+0' },
        { role: 'zoomIn', accelerator: 'CommandOrControl+Plus' },
        { role: 'zoomOut', accelerator: 'CommandOrControl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: 'F11' },
      ],
    },
    { role: 'windowMenu' },
    { 
      role: 'help', 
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            if (!app.isPackaged) {
              dialog.showMessageBox({
                type: 'info',
                title: 'Updates',
                message: 'Update checks only work in the packaged app.',
                buttons: ['OK']
              });
              return;
            }
            dialog.showMessageBox({
              type: 'info',
              title: 'Checking for Updates',
              message: `Current version: ${app.getVersion()}\nChecking for updates...`,
              buttons: ['OK']
            });
            autoUpdater.checkForUpdates();
          }
        }
      ]
    },
  ] as Electron.MenuItemConstructorOptions[];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Create window immediately - show it right away
  // Don't wait for database or anything else
  createWindow();

  // Check for updates on app start (only when packaged)
  if (!app.isPackaged) {
    console.log('Running in dev mode - skipping update check');
  } else {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }

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

// License (Gumroad) IPC handlers
ipcMain.handle('license:get', () => getLicenseKey());
ipcMain.handle('license:verify', async (_event, licenseKey: string) => {
  const result = await verifyLicense(licenseKey);
  if (result.success) {
    setLicenseKey(licenseKey);
  }
  return result;
});
ipcMain.handle('license:clear', () => clearLicenseKey());

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  const win = mainWindow;
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Download now?`,
    buttons: ['Yes', 'No'],
  }).then((result) => {
    if (result.response === 0) {
      console.log('User confirmed download, starting update download...');
      autoUpdater.downloadUpdate().then(() => {
        console.log('Download started successfully');
      }).catch((err) => {
        console.error('Failed to start download:', err);
        if (win) {
          dialog.showMessageBox(win, {
            type: 'error',
            title: 'Download Failed',
            message: `Failed to start download: ${err.message}`,
            buttons: ['OK']
          });
        }
      });
    }
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  console.log(logMessage);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. Current version is the latest:', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  const win = mainWindow;
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update Ready',
    message: `Update ${info.version} has been downloaded. Restart now to install?`,
    buttons: ['Restart', 'Later'],
  }).then((result) => {
    if (result.response === 0) {
      console.log('User chose to restart and install');
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  const win = mainWindow;
  if (win) {
    dialog.showMessageBox(win, {
      type: 'error',
      title: 'Update Error',
      message: `Failed to check for updates: ${err.message}`,
      buttons: ['OK']
    });
  }
});

// Import all other IPC handlers
import './ipc-handlers';
