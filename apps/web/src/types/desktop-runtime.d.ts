export {};

declare global {
  interface Window {
    desktopRuntimeConfig?: {
      apiBaseUrl: string;
      isDesktop: true;
    };
  }
}
