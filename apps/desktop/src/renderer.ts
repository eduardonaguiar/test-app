const runtimeElement = document.getElementById('runtime');

if (runtimeElement) {
  runtimeElement.textContent = `Desktop mode enabled. API: ${window.desktopRuntimeConfig.apiBaseUrl}`;
}
