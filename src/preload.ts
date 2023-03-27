// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    ready: () => ipcRenderer.send('ready')
})

contextBridge.exposeInMainWorld('DEFAULT_BIRDGE_URL', 'https://chatgpt.gptbox.tech');
