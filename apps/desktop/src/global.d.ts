export {};

declare global {
  interface Window {
    desktopRuntimeConfig: {
      apiBaseUrl: string;
      isDesktop: true;
    };
  }
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
