export {};

declare global {
  interface Window {
    desktopRuntimeConfig: {
      apiBaseUrl: string;
      isDesktop: true;
    };
    desktopAppControls: {
      quitApp: () => Promise<void>;
      openLogsDirectory: () => Promise<string>;
    };
  }
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
