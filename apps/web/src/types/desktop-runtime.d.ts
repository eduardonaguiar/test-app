export {};

declare global {
  interface Window {
    desktopRuntimeConfig?: {
      apiBaseUrl: string;
      isDesktop: true;
    };
    desktopAppControls?: {
      quitApp: () => Promise<void>;
      openLogsDirectory: () => Promise<string>;
    };
  }
}
