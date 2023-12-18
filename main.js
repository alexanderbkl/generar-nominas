import { app, BrowserWindow } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL(
    isDev
      ? 'http://localhost:5173' // URL for dev server
      : `file://${path.join(__dirname, '../dist/index.html')}` // URL for production build
  );
}

app.whenReady().then(createWindow);