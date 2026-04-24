import { app, BrowserWindow } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import type { WriteStream } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const WEB_DEV_SERVER_CANDIDATES = [
  process.env.EXAM_RUNNER_WEB_DEV_SERVER_URL,
  process.env.VITE_WEB_DEV_SERVER_URL,
  'http://localhost:5173',
].filter((value): value is string => typeof value === 'string' && value.length > 0);

const API_DEFAULT_PORT = 8080;
const API_HOST = '127.0.0.1';
const API_LOG_FILE_NAME = 'backend-sidecar.log';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;

let backendProcess: ChildProcess | null = null;
let backendLogStream: WriteStream | null = null;
let isBackendShutdownInProgress = false;

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

const resolveBackendPort = (): number => {
  const parsed = Number(process.env.EXAM_RUNNER_API_PORT);

  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  return API_DEFAULT_PORT;
};

const isPortAvailable = async (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, API_HOST);
  });

const resolveExecutableName = (): string => (process.platform === 'win32' ? 'ExamRunner.Api.exe' : 'ExamRunner.Api');

const resolveBackendExecutableCandidates = (): string[] => {
  const executableName = resolveExecutableName();

  if (app.isPackaged) {
    return [
      path.join(process.resourcesPath, 'backend', executableName),
      path.join(process.resourcesPath, 'backend', 'ExamRunner.Api', executableName),
      path.join(process.resourcesPath, executableName),
    ];
  }

  const desktopRoot = app.getAppPath();
  const repoRoot = path.resolve(desktopRoot, '..', '..');

  return [
    path.join(repoRoot, 'apps', 'api', 'publish', 'win-x64', 'ExamRunner.Api.exe'),
    path.join(repoRoot, 'apps', 'api', 'publish', 'linux-x64', 'ExamRunner.Api'),
    path.join(repoRoot, 'apps', 'api', 'publish', 'osx-x64', 'ExamRunner.Api'),
    path.join(repoRoot, 'apps', 'api', 'publish', 'osx-arm64', 'ExamRunner.Api'),
  ];
};

type BackendLaunchTarget = {
  args: string[];
  command: string;
  cwd: string;
  executableDescription: string;
};

const resolveBackendLaunchTarget = (backendPort: number): BackendLaunchTarget => {
  const customExecutable = process.env.EXAM_RUNNER_API_EXECUTABLE;

  if (customExecutable && existsSync(customExecutable)) {
    return {
      command: customExecutable,
      args: [],
      cwd: path.dirname(customExecutable),
      executableDescription: customExecutable,
    };
  }

  for (const candidate of resolveBackendExecutableCandidates()) {
    if (existsSync(candidate)) {
      return {
        command: candidate,
        args: [],
        cwd: path.dirname(candidate),
        executableDescription: candidate,
      };
    }
  }

  const desktopRoot = app.getAppPath();
  const repoRoot = path.resolve(desktopRoot, '..', '..');
  const apiProjectPath = path.join(repoRoot, 'apps', 'api', 'src', 'ExamRunner.Api', 'ExamRunner.Api.csproj');

  return {
    command: 'dotnet',
    args: ['run', '--project', apiProjectPath, '--no-launch-profile', '--urls', `http://${API_HOST}:${backendPort}`],
    cwd: repoRoot,
    executableDescription: 'dotnet run (fallback de desenvolvimento)',
  };
};

const openBackendLogStream = (): WriteStream => {
  const logsDirectory = path.join(app.getPath('logs'), 'ExamRunnerDesktop');
  mkdirSync(logsDirectory, { recursive: true });

  const logFilePath = path.join(logsDirectory, API_LOG_FILE_NAME);
  return createWriteStream(logFilePath, { flags: 'a' });
};

const writeBackendLog = (message: string): void => {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  backendLogStream?.write(`${line}\n`);
};

const startBackendProcess = async (): Promise<void> => {
  if (backendProcess) {
    return;
  }

  const backendPort = resolveBackendPort();
  const available = await isPortAvailable(backendPort);

  if (!available) {
    writeBackendLog(`Porta ${backendPort} já está em uso. Defina EXAM_RUNNER_API_PORT para outra porta.`);
    throw new Error(`A porta ${backendPort} não está disponível para o backend sidecar.`);
  }

  const launchTarget = resolveBackendLaunchTarget(backendPort);
  backendLogStream = openBackendLogStream();
  writeBackendLog(`Iniciando backend sidecar em http://${API_HOST}:${backendPort}`);
  writeBackendLog(`Executável alvo: ${launchTarget.executableDescription}`);

  const spawnedProcess = spawn(launchTarget.command, launchTarget.args, {
    cwd: launchTarget.cwd,
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: app.isPackaged ? 'Production' : 'Development',
      ASPNETCORE_URLS: `http://${API_HOST}:${backendPort}`,
      EXAM_RUNNER_API_PORT: String(backendPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendProcess = spawnedProcess;

  spawnedProcess.stdout?.on('data', (chunk: Buffer) => {
    writeBackendLog(`[api:stdout] ${chunk.toString().trimEnd()}`);
  });

  spawnedProcess.stderr?.on('data', (chunk: Buffer) => {
    writeBackendLog(`[api:stderr] ${chunk.toString().trimEnd()}`);
  });

  spawnedProcess.on('exit', (code, signal) => {
    writeBackendLog(`Backend encerrado (code=${String(code)}, signal=${String(signal)}).`);
    backendProcess = null;
  });

  spawnedProcess.on('error', (error) => {
    writeBackendLog(`Erro ao iniciar backend sidecar: ${error.message}`);
  });
};

const stopBackendProcess = async (): Promise<void> => {
  if (!backendProcess || backendProcess.killed) {
    backendLogStream?.end();
    backendLogStream = null;
    return;
  }

  const processToStop = backendProcess;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (!processToStop.killed) {
        processToStop.kill('SIGKILL');
      }
    }, 5_000);

    processToStop.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    processToStop.kill('SIGTERM');
  });

  backendProcess = null;
  backendLogStream?.end();
  backendLogStream = null;
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
  startBackendProcess()
    .then(() => createWindow())
    .catch((error: unknown) => {
      console.error('Falha ao iniciar desktop com backend sidecar', error);
      void stopBackendProcess().finally(() => app.quit());
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error: unknown) => {
        console.error('Falha ao recriar janela principal', error);
      });
    }
  });
});

app.on('before-quit', (event) => {
  if (isBackendShutdownInProgress) {
    return;
  }

  isBackendShutdownInProgress = true;
  event.preventDefault();

  void stopBackendProcess().finally(() => {
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
