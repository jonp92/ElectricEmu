/**
 * @file preload.js
 * @description This file is used to expose custom APIs to the renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose custom APIs to the renderer process
 */
contextBridge.exposeInMainWorld('api', {
    /**
     * Open a file dialog to select a file.
     * @returns {Promise<{fileName: string, fileData: string}>} The selected file's name and data.
     */
    selectFile: () => ipcRenderer.invoke('dialog:openFile'),

    /**
     * Save a ROM to the file system and database.
     * @param {string} fileName - The name of the file.
     * @param {string} data - The base64 encoded data of the file.
     * @returns {Promise<boolean>} A promise that resolves to true if the ROM is saved successfully.
     */
    saveRom: (fileName, data) => ipcRenderer.invoke('rom:save', fileName, data),

    /**
     * Load all ROMs from the database.
     * @returns {Promise<Array>} A promise that resolves to an array of ROM objects.
     */
    loadRoms: () => ipcRenderer.invoke('rom:load'),

    /**
     * Delete a ROM from the file system and database.
     * @param {string} fileName - The name of the file to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the ROM is deleted successfully.
     */
    deleteRom: (fileName) => ipcRenderer.invoke('rom:delete', fileName),

    /**
     * Edit game details in the database.
     * @param {Object} game - The game object containing updated details.
     * @returns {Promise<boolean>} A promise that resolves to true if the game is updated successfully.
     */
    editRom: (game) => ipcRenderer.invoke('rom:edit', game),

    /**
     * Toggle the favorite status of a game.
     * @param {string} gamePath - The path of the game.
     * @returns {Promise<number>} A promise that resolves to the new favorite status (0 or 1).
     */
    toggleFavorite: (gamePath) => ipcRenderer.invoke('toggleFavorite', gamePath),

    /**
     * Show a message box dialog.
     * @param {Object} options - The options for the message box.
     * @returns {Promise<number>} A promise that resolves to the index of the button clicked.
     */
    showMessageBox: (options) => ipcRenderer.invoke('show-dialog', options),

    /**
     * Show a custom dialog.
     * @param {Object} options - The options for the custom dialog.
     * @returns {Promise<any>} A promise that resolves to the response from the dialog.
     */
    showCustomDialog: (options) => ipcRenderer.invoke('show-custom-dialog', options),

    /**
     * Send a response from the custom dialog.
     * @param {any} response - The response to send.
     */
    sendDialogResponse: (response) => ipcRenderer.send('dialog-response', response),

    /**
     * Listen for the 'set-content' event and execute a callback.
     * @param {function(string): void} callback - The callback to execute when the event is received.
     */
    onSetContent: (callback) => ipcRenderer.on('set-content', (event, content) => callback(content)),

    /**
     * Open a file dialog to select a file.
     * @returns {Promise<string>} A promise that resolves to the selected file path.
     */
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

    /**
     * Scrape artwork for a game.
     * @param {string} gameTitle - The title of the game.
     * @param {string} system - The system of the game.
     */
    scrapeArtwork: (gameTitle, system) => ipcRenderer.invoke('scrapeArtwork', gameTitle, system),
    /**
     * Scrape Game metadata
     * @param {string} gameTitle - The title of the game.
     * @param {string} system - The system of the game.
     */
    scrapeMeta: (gameTitle, system, gamePath) => ipcRenderer.invoke('rom:scrape', gameTitle, system, gamePath),

});



document.addEventListener("DOMContentLoaded", () => {
    console.log("Preload.js loaded");
});

/**
 * Event listener for the global event "exitEmulator"
 * 
 * @description This event is triggered when the user exits the emulator.
 * We can use this event to reload the window when the user exits the emulator.
 */
document.addEventListener("exitEmulator", function (event) {
    console.log("Global event exitEmulator");
    console.log("Message: " + event.detail.message);
    console.log("Time: " + event.detail.time);
    console.log("Game: " + event.detail.game);
    console.log("Exit: " + event.detail.exit);
    if (event.detail.exit) {
        window.location.reload();
    }
});