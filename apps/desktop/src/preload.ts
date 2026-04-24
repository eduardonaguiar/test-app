import { contextBridge } from 'electron';

const apiPortRaw = process.env.EXAM_RUNNER_API_PORT;
const parsedApiPort = Number(apiPortRaw);
const apiPort = Number.isInteger(parsedApiPort) && parsedApiPort > 0 && parsedApiPort <= 65535 ? parsedApiPort : 8080;

contextBridge.exposeInMainWorld('desktopRuntimeConfig', {
  apiBaseUrl: `http://127.0.0.1:${apiPort}`,
  isDesktop: true,
});
