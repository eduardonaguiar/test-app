import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('desktopInfo', {
  platform: process.platform,
  versions: process.versions,
});
