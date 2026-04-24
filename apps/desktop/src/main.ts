import { app, BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';

const WEB_DEV_SERVER_CANDIDATES = [
  process.env.EXAM_RUNNER_WEB_DEV_SERVER_URL,
  process.env.VITE_WEB_DEV_SERVER_URL,
  'http://localhost:5173',
].filter((value): value is string => typeof value === 'string' && value.length > 0);

const safeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const canConnectToUrl = async (rawUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);

    const response = await fetch(rawUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

const loadMissingWebBuildError = async (mainWindow: BrowserWindow, expectedPath: string): Promise<void> => {
  const message = `\n    <h1>Web build não encontrado</h1>\n    <p>O Electron não localizou os arquivos estáticos do React.</p>\n    <p>Esperado em: <code>${safeHtml(expectedPath)}</code></p>\n    <p>Execute <code>pnpm desktop:web:prepare</code> antes de empacotar.</p>\n  `;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
};

const loadRenderer = async (mainWindow: BrowserWindow): Promise<void> => {
  if (!app.isPackaged) {
    for (const candidateUrl of WEB_DEV_SERVER_CANDIDATES) {
      if (await canConnectToUrl(candidateUrl)) {
        await mainWindow.loadURL(candidateUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        return;
      }
    }

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      return;
    }
  }

  const packagedWebIndexPath = path.join(app.getAppPath(), 'web-dist', 'index.html');

  if (!existsSync(packagedWebIndexPath)) {
    await loadMissingWebBuildError(mainWindow, packagedWebIndexPath);
    return;
  }

  await mainWindow.loadFile(packagedWebIndexPath);
};

const createWindow = async (): Promise<void> => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await loadRenderer(mainWindow);
};

app.whenReady().then(() => {
  createWindow().catch((error: unknown) => {
    console.error('Falha ao iniciar janela principal', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error: unknown) => {
        console.error('Falha ao recriar janela principal', error);
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
