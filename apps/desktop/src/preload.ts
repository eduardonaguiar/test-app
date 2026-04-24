import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';

const apiPortArgPrefix = '--exam-runner-api-port=';
const apiPortArg = process.argv.find((value) => value.startsWith(apiPortArgPrefix));
const apiPortRaw = apiPortArg?.slice(apiPortArgPrefix.length);
const parsedApiPort = Number(apiPortRaw);
const apiPort = Number.isInteger(parsedApiPort) && parsedApiPort > 0 && parsedApiPort <= 65535 ? parsedApiPort : 8080;

contextBridge.exposeInMainWorld('desktopRuntimeConfig', Object.freeze({
  apiBaseUrl: `http://127.0.0.1:${apiPort}`,
  isDesktop: true,
}));

contextBridge.exposeInMainWorld('desktopAppControls', Object.freeze({
  quitApp: (): Promise<void> => ipcRenderer.invoke('desktop:quit-app'),
  openLogsDirectory: (): Promise<string> => ipcRenderer.invoke('desktop:open-logs-directory'),
}));
