const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.ico');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'BillAppSoft ERP',
    icon: iconPath,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default OS browser instead of Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('app://localhost/index.html');
  }
}

app.whenReady().then(() => {
  // Protocol handler for serving static Next.js export in production
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let relativePath = decodeURIComponent(url.pathname);
    if (relativePath === '/' || relativePath === '') {
      relativePath = '/index.html';
    } else if (!path.extname(relativePath)) {
      relativePath = path.join(relativePath, 'index.html');
    }
    const filePath = path.join(__dirname, '..', 'out', relativePath);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

