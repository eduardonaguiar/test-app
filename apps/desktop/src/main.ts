import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
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
const MAIN_LOG_FILE_PREFIX = 'electron-main';
const API_LOG_FILE_PREFIX = 'backend-sidecar';
const DESKTOP_APP_DATA_DIRECTORY = 'ExamRunner';
const DESKTOP_DATA_SUBDIRECTORY = 'data';
const BACKEND_HEALTH_TIMEOUT_MS = 30_000;
const BACKEND_HEALTH_RETRY_INTERVAL_MS = 750;
const REQUIRED_PACKAGED_RESOURCE_DIRECTORIES = {
  backendPublish: 'win-x64',
  webBuild: 'web-dist',
} as const;
const WEB_ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'data:']);

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;

let backendProcess: ChildProcess | null = null;
let backendLogStream: WriteStream | null = null;
let mainLogStream: WriteStream | null = null;
let isBackendShutdownInProgress = false;
let startupValidationError: string | null = null;
const logSessionId = new Date().toISOString().replaceAll(':', '-');

const safeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const tryParseUrl = (rawUrl: string): URL | null => {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
};

const isAllowedTopLevelNavigation = (rawUrl: string): boolean => {
  const parsedUrl = tryParseUrl(rawUrl);

  if (!parsedUrl || !WEB_ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return false;
  }

  if (parsedUrl.protocol === 'file:' || parsedUrl.protocol === 'data:') {
    return true;
  }

  if (parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost') {
    return true;
  }

  return false;
};

const isSafeExternalUrl = (rawUrl: string): boolean => {
  const parsedUrl = tryParseUrl(rawUrl);
  return parsedUrl !== null && (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:');
};

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

const sleep = async (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

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

const resolvePackagedBackendCandidates = (): string[] => {
  const executableName = resolveExecutableName();

  return [
    path.join(process.resourcesPath, REQUIRED_PACKAGED_RESOURCE_DIRECTORIES.backendPublish, executableName),
    path.join(process.resourcesPath, 'backend', executableName),
    path.join(process.resourcesPath, 'backend', 'ExamRunner.Api', executableName),
    path.join(process.resourcesPath, executableName),
  ];
};

const resolvePackagedWebIndexCandidates = (): string[] => [
  path.join(process.resourcesPath, REQUIRED_PACKAGED_RESOURCE_DIRECTORIES.webBuild, 'index.html'),
  path.join(app.getAppPath(), 'web-dist', 'index.html'),
];

const resolveBackendExecutableCandidates = (): string[] => {
  if (app.isPackaged) {
    return resolvePackagedBackendCandidates();
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

  if (app.isPackaged) {
    const expectedCandidates = resolveBackendExecutableCandidates().join('\n - ');
    throw new Error(
      `Artefato do backend não encontrado no pacote final. Caminhos esperados:\n - ${expectedCandidates}`,
    );
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


type DesktopStoragePaths = {
  dataRootDirectory: string;
  sqliteDirectory: string;
  sqliteDatabasePath: string;
  logsDirectory: string;
};

const resolveDesktopStoragePaths = (): DesktopStoragePaths => {
  const appDataRoot = app.getPath('appData');
  const dataRootDirectory = path.join(appDataRoot, DESKTOP_APP_DATA_DIRECTORY);
  const sqliteDirectory = path.join(dataRootDirectory, DESKTOP_DATA_SUBDIRECTORY);

  return {
    dataRootDirectory,
    sqliteDirectory,
    sqliteDatabasePath: path.join(sqliteDirectory, 'exam-runner.db'),
    logsDirectory: path.join(dataRootDirectory, 'logs'),
  };
};

const ensureDesktopStorageDirectories = (): DesktopStoragePaths => {
  const storagePaths = resolveDesktopStoragePaths();
  mkdirSync(storagePaths.sqliteDirectory, { recursive: true });
  mkdirSync(storagePaths.logsDirectory, { recursive: true });
  return storagePaths;
};

const openBackendLogStream = (): WriteStream => {
  const storagePaths = ensureDesktopStorageDirectories();
  const logFilePath = path.join(storagePaths.logsDirectory, `${API_LOG_FILE_PREFIX}-${logSessionId}.log`);
  return createWriteStream(logFilePath, { flags: 'a' });
};

const openMainLogStream = (): WriteStream => {
  const storagePaths = ensureDesktopStorageDirectories();
  const logFilePath = path.join(storagePaths.logsDirectory, `${MAIN_LOG_FILE_PREFIX}-${logSessionId}.log`);
  return createWriteStream(logFilePath, { flags: 'a' });
};

const writeMainLog = (message: string): void => {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  mainLogStream?.write(`${line}\n`);
};

const writeBackendLog = (message: string): void => {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  backendLogStream?.write(`${line}\n`);
  mainLogStream?.write(`${line} [backend]\n`);
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

  const storagePaths = ensureDesktopStorageDirectories();
  writeMainLog(`Diretório de logs: ${storagePaths.logsDirectory}`);
  const launchTarget = resolveBackendLaunchTarget(backendPort);
  backendLogStream = openBackendLogStream();
  writeBackendLog(`Iniciando backend sidecar em http://${API_HOST}:${backendPort}`);
  writeBackendLog(`Executável alvo: ${launchTarget.executableDescription}`);
  writeBackendLog(`Diretório de dados local: ${storagePaths.dataRootDirectory}`);
  writeBackendLog(`SQLite local: ${storagePaths.sqliteDatabasePath}`);

  const spawnedProcess = spawn(launchTarget.command, launchTarget.args, {
    cwd: launchTarget.cwd,
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: app.isPackaged ? 'Production' : 'Development',
      ASPNETCORE_URLS: `http://${API_HOST}:${backendPort}`,
      EXAM_RUNNER_API_PORT: String(backendPort),
      Desktop__Enabled: 'true',
      Desktop__DatabasePath: storagePaths.sqliteDatabasePath,
      EXAM_RUNNER_DATA_DIR: storagePaths.dataRootDirectory,
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

const loadPackagedArtifactsError = async (mainWindow: BrowserWindow, details: string): Promise<void> => {
  const message = `
    <main style="font-family: Arial, sans-serif; margin: 2rem; max-width: 56rem; line-height: 1.6;">
      <h1>Artefatos obrigatórios não encontrados</h1>
      <p>O aplicativo instalado não localizou os arquivos necessários do frontend ou backend.</p>
      <p>Revise o empacotamento do Electron Forge (extraResource) e gere novamente os artefatos.</p>
      <p>Detalhes:</p>
      <pre style="padding: 1rem; background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; white-space: pre-wrap;">${safeHtml(details)}</pre>
    </main>
  `;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
};

const loadBackendStartupError = async (mainWindow: BrowserWindow, details: string): Promise<void> => {
  const message = `
    <main style="font-family: Arial, sans-serif; margin: 2rem; max-width: 56rem; line-height: 1.6;">
      <h1>Não foi possível iniciar o backend local</h1>
      <p>O aplicativo não conseguiu concluir a inicialização porque o backend local não respondeu a tempo.</p>
      <p>Verifique se não há outra aplicação ocupando a porta configurada e tente abrir o app novamente.</p>
      <p>Você pode fechar o aplicativo agora ou abrir a pasta de logs para diagnóstico.</p>
      <div style="display: flex; gap: 0.75rem; margin: 1.25rem 0 1.5rem;">
        <button id="open-logs" style="padding: 0.55rem 0.95rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #fff; cursor: pointer;">Abrir logs</button>
        <button id="close-app" style="padding: 0.55rem 0.95rem; border: 1px solid #2563eb; border-radius: 0.5rem; background: #2563eb; color: #fff; cursor: pointer;">Fechar aplicativo</button>
      </div>
      <p>Detalhes técnicos:</p>
      <pre style="padding: 1rem; background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; white-space: pre-wrap;">${safeHtml(details)}</pre>
      <p>Arquivo de log principal: <code>${safeHtml(path.join(resolveDesktopStoragePaths().logsDirectory, `${MAIN_LOG_FILE_PREFIX}-${logSessionId}.log`))}</code></p>
      <p>Arquivo de log do backend: <code>${safeHtml(path.join(resolveDesktopStoragePaths().logsDirectory, `${API_LOG_FILE_PREFIX}-${logSessionId}.log`))}</code></p>
    </main>
    <script>
      document.getElementById('close-app')?.addEventListener('click', () => {
        window.desktopAppControls?.quitApp();
      });

      document.getElementById('open-logs')?.addEventListener('click', async () => {
        await window.desktopAppControls?.openLogsDirectory();
      });
    </script>
  `;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
};

const loadStartupLoadingScreen = async (mainWindow: BrowserWindow): Promise<void> => {
  const message = `
    <main style="font-family: Arial, sans-serif; margin: 2rem; max-width: 48rem; line-height: 1.6;">
      <h1>Iniciando Exam Runner...</h1>
      <p>Estamos preparando o backend local para você continuar seus estudos com segurança.</p>
      <p style="margin-top: 1rem; color: #374151;">Isso normalmente leva alguns segundos.</p>
    </main>
  `;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
};

const waitForBackendHealth = async (): Promise<void> => {
  const backendPort = resolveBackendPort();
  const healthUrl = `http://${API_HOST}:${backendPort}/health`;
  const deadline = Date.now() + BACKEND_HEALTH_TIMEOUT_MS;
  let lastFailureReason = 'Aguardando backend responder.';

  while (Date.now() < deadline) {
    if (!backendProcess) {
      throw new Error('Processo do backend não está em execução.');
    }

    try {
      const response = await fetch(healthUrl, { method: 'GET' });

      if (response.ok) {
        writeBackendLog(`Healthcheck confirmado em ${healthUrl}.`);
        return;
      }

      lastFailureReason = `Healthcheck retornou status ${response.status}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastFailureReason = `Falha de conexão com /health: ${message}`;
    }

    await sleep(BACKEND_HEALTH_RETRY_INTERVAL_MS);
  }

  throw new Error(
    `Timeout de ${BACKEND_HEALTH_TIMEOUT_MS}ms ao consultar ${healthUrl}. Último erro: ${lastFailureReason}`,
  );
};

const validatePackagedArtifacts = (): string | null => {
  if (!app.isPackaged) {
    return null;
  }

  const missingArtifacts: string[] = [];

  if (!resolvePackagedWebIndexCandidates().some((candidate) => existsSync(candidate))) {
    missingArtifacts.push(
      `Web build ausente. Esperado em um destes caminhos:\n - ${resolvePackagedWebIndexCandidates().join('\n - ')}`,
    );
  }

  if (!resolvePackagedBackendCandidates().some((candidate) => existsSync(candidate))) {
    missingArtifacts.push(
      `Executável da API ausente. Esperado em um destes caminhos:\n - ${resolvePackagedBackendCandidates().join('\n - ')}`,
    );
  }

  return missingArtifacts.length > 0 ? missingArtifacts.join('\n\n') : null;
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

  const packagedWebIndexPath = resolvePackagedWebIndexCandidates().find((candidate) => existsSync(candidate));

  if (!packagedWebIndexPath) {
    await loadMissingWebBuildError(mainWindow, resolvePackagedWebIndexCandidates()[0]);
    return;
  }

  await mainWindow.loadFile(packagedWebIndexPath);
};

const createWindow = async (): Promise<void> => {
  writeMainLog('Criando janela principal do desktop.');
  const backendPort = resolveBackendPort();
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--exam-runner-api-port=${backendPort}`],
    },
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedTopLevelNavigation(url)) {
      event.preventDefault();
      writeMainLog(`Navegação bloqueada para URL não permitida: ${url}`);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    } else {
      writeMainLog(`window.open bloqueado para URL insegura: ${url}`);
    }

    return { action: 'deny' };
  });

  if (startupValidationError) {
    writeMainLog(`Falha de validação de artefatos no startup: ${startupValidationError}`);
    await loadPackagedArtifactsError(mainWindow, startupValidationError);
    return;
  }

  try {
    await loadStartupLoadingScreen(mainWindow);
    await waitForBackendHealth();
    await loadRenderer(mainWindow);
    writeMainLog('UI carregada com sucesso.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeBackendLog(`Falha ao aguardar healthcheck do backend: ${message}`);
    writeMainLog(`Falha ao inicializar renderer: ${message}`);
    await loadBackendStartupError(mainWindow, message);
  }
};

app.whenReady().then(() => {
  ipcMain.handle('desktop:quit-app', () => {
    app.quit();
  });

  ipcMain.handle('desktop:open-logs-directory', async () => {
    const logsDirectory = resolveDesktopStoragePaths().logsDirectory;
    await shell.openPath(logsDirectory);
    return logsDirectory;
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler(() => false);

  const storagePaths = ensureDesktopStorageDirectories();
  mainLogStream = openMainLogStream();
  writeMainLog(`Electron pronto. Logs em ${storagePaths.logsDirectory}`);
  startupValidationError = validatePackagedArtifacts();

  if (startupValidationError) {
    writeMainLog(`Validação de artefatos falhou: ${startupValidationError}`);
    void createWindow();
    return;
  }

  startBackendProcess()
    .then(() => createWindow())
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      writeMainLog(`Falha ao iniciar desktop com backend sidecar: ${message}`);
      void createWindow();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error: unknown) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        writeMainLog(`Falha ao recriar janela principal: ${message}`);
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
    writeMainLog('Encerrando aplicativo desktop.');
    mainLogStream?.end();
    mainLogStream = null;
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  writeMainLog(`uncaughtException: ${error.stack ?? error.message}`);
});

process.on('unhandledRejection', (reason) => {
  writeMainLog(`unhandledRejection: ${String(reason)}`);
});
