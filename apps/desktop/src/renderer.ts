const runtimeElement = document.getElementById('runtime');

if (runtimeElement) {
  runtimeElement.textContent = `Running on ${window.desktopInfo.platform} with Electron ${window.desktopInfo.versions.electron}`;
}
