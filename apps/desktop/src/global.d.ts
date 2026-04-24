export {};

declare global {
  interface Window {
    desktopInfo: {
      platform: string;
      versions: NodeJS.ProcessVersions;
    };
  }
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
