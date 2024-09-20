/**
 * @file main.js
 * @description Main process for the Electron application. Handles window creation, database initialization, and IPC event handling.
 */

const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const scrapeArtwork = require('./gameScraper');

// Paths and global variables
const launchFile = "assets/index.html";
let mainWindow;
let dialogWindow;
const homeDir = os.homedir();
const subDir = path.join(homeDir, 'ElectricEmu');
const romsPath = path.join(homeDir, 'ElectricEmu', 'ROMs');
const metadataPath = path.join(__dirname, 'assets', 'meta');
const dbPath = path.join(homeDir, 'ElectricEmu', 'gameLibrary.db');  // Path to the SQLite database (stored in user's home directory to allow migration and multiple instances)

// Ensure the directory exists
if (!fs.existsSync(subDir)) {
  fs.mkdirSync(subDir, { recursive: true });
}

/**
 * Initialize the SQLite database and create the games table if it doesn't exist.
 */
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
      console.error('Error opening database:', err);
  } else {
      console.log('Connected to SQLite database');
      db.run(`
          CREATE TABLE IF NOT EXISTS games (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              path TEXT NOT NULL UNIQUE,
              core TEXT NOT NULL,
              description TEXT,
              artwork TEXT,
              favorite INTEGER DEFAULT 0
          )
      `, (err) => {
          if (err) {
              console.error('Error creating table:', err);
          } else {
              console.log('Games table created or already exists');
          }
      });
  }
});

console.log('ROMs Path:', romsPath);
console.log('Metadata Path:', metadataPath);

/**
 * Create the main application window.
 */
function createWindow() {
    let iconPath;

    if (process.platform === 'darwin') {
        iconPath = path.join(__dirname, 'assets/docs/macos/logo.icns');
    }
    else if (process.platform === 'win32') {
        iconPath = path.join(__dirname, 'assets/docs/Logo.ico');
    } else {
        iconPath = path.join(__dirname, 'assets/docs/Logo.png');
    }

    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        frame: true,
        titleBarStyle: 'hidden',
        backgroundColor: '#777',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        icon: iconPath
    });

    mainWindow.loadFile(launchFile);

    // Intercept all requests and modify response headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = details.responseHeaders;

        // Set the COOP and COEP headers
        headers['Cross-Origin-Opener-Policy'] = ['same-origin'];
        headers['Cross-Origin-Embedder-Policy'] = ['require-corp'];

        callback({
            responseHeaders: headers
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Ensure the ROM directory exists
if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir);
}
if (!fs.existsSync(romsPath)) {
    fs.mkdirSync(romsPath);
}

/**
 * Remove text inside parentheses from game names.
 * @param {string} name - The original game name.
 * @returns {string} The cleaned game name.
 */
function cleanGameName(name) {
    return name.replace(/\s*\(.*?\)\s*/g, '');
}

/**
 * Handle opening file dialog for ROM upload.
 * @returns {Promise<{fileName: string, fileData: string}>} The selected file's name and data.
 */
ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'ROM Files', extensions: ['nes', 'gba', 'snes', 'psx'] }]
    });

    if (canceled || filePaths.length === 0) {
        return null;
    } else {
        const fileName = path.basename(filePaths[0]);
        const fileData = fs.readFileSync(filePaths[0], 'base64');
        console.log('File selected:', fileName);
        return { fileName, fileData };
    }
});

/**
 * Save the uploaded ROM to the file system and database.
 * @param {string} fileName - The name of the file.
 * @param {string} data - The base64 encoded data of the file.
 * @returns {Promise<boolean>} A promise that resolves to true if the ROM is saved successfully.
 */
ipcMain.handle('rom:save', (event, fileName, data) => {
    const filePath = path.join(romsPath, fileName);
    const fileNameNoExt = fileName.split('.').slice(0, -1).join('.');
    const core = fileName.split('.').pop();
    let found;
    let cleanedFilename;
    scrapeArtwork(fileNameNoExt, core).then((result) => {
        found = result.found;
        cleanedFilename = result.cleanedFilename;
        console.log('Artwork found:', found, 'Cleaned filename:', cleanedFilename);
        const artworkPath = found ? cleanedFilename : null; 
        return new Promise((resolve, reject) => {
            try {
                fs.writeFileSync(filePath, data, 'base64');
                db.run(
                    `INSERT INTO games (name, path, core, artwork) VALUES (?, ?, ?, ?)
                    ON CONFLICT(path) DO UPDATE SET
                        name=excluded.name,
                        core=excluded.core`,
                    [cleanGameName(fileNameNoExt), filePath, core, `artwork/${artworkPath}`],
                    function(err) {
                        if (err) {
                            console.error('Error saving ROM to database:', err);
                            reject(false);
                        } else {
                            console.log('ROM saved to database:', fileName);
                            resolve(true);
                        }
                    }
                );
            } catch (error) {
                console.error('Error saving ROM:', error);
                reject(false);
            }
        });
    });
});

/**
 * Load all ROMs from the database.
 * @returns {Promise<Array>} A promise that resolves to an array of ROM objects.
 */
ipcMain.handle('rom:load', () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM games', (err, rows) => {
            if (err) {
                console.error('Error loading games:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

/**
 * Delete a ROM from the file system and database.
 * @param {string} fileName - The name of the file to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if the ROM is deleted successfully.
 */
ipcMain.handle('rom:delete', (event, fileName) => {
    const filePath = path.join(romsPath, fileName);
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            db.run('DELETE FROM games WHERE path = ?', [filePath], function(err) {
                if (err) {
                    console.error('Error deleting ROM from database:', err);
                    reject(false);
                } else {
                    console.log('ROM deleted from database:', fileName);
                    resolve(true);
                }
            });
        } else {
            console.error('File does not exist:', filePath);
            reject(false);
        }
    });
});

/**
 * Edit game details in the database.
 * @param {Object} game - The game object containing updated details.
 * @returns {Promise<boolean>} A promise that resolves to true if the game is updated successfully.
 */
ipcMain.handle('rom:edit', async (event, game) => {
    console.log('Received Edit Game Request, pushing to DB:', game);
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE games SET name = ?, core = ?, description = ?, artwork = ? WHERE path = ?`,
            [game.name, game.core, game.description, game.artwork, game.path],
            function(err) {
                if (err) {
                    console.error('Error updating game:', err);
                    reject(false);
                } else {
                    console.log('Game updated:', game.name);
                    resolve(true);
                }
            }
        );
    });
});

/**
 * Toggle the favorite status of a game.
 * @param {string} gamePath - The path of the game.
 * @returns {Promise<number>} A promise that resolves to the new favorite status (0 or 1).
 */
ipcMain.handle('toggleFavorite', async (event, gamePath) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT favorite FROM games WHERE path = ?', [gamePath], (err, row) => {
            if (err) {
                console.error('Error toggling favorite:', err);
                reject(err);
            } else {
                const newFavoriteStatus = row.favorite ? 0 : 1;
                db.run('UPDATE games SET favorite = ? WHERE path = ?', [newFavoriteStatus, gamePath], function(err) {
                    if (err) {
                        console.error('Error updating favorite status:', err);
                        reject(err);
                    } else {
                        resolve(newFavoriteStatus);
                    }
                });
            }
        });
    });
});

/**
 * Show a message box dialog.
 * @param {Object} options - The options for the message box.
 * @returns {Promise<number>} A promise that resolves to the index of the button clicked.
 */
ipcMain.handle('show-dialog', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: options.type || 'info',
        title: options.title || 'Message',
        message: options.message || '',
        buttons: options.buttons || ['OK'],
        defaultId: options.defaultId || 0
    });

    return result.response;  // Return the index of the button clicked
});

/**
 * Open a file dialog to select a file.
 * @returns {Promise<string>} A promise that resolves to the selected file path.
 */
ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'ROM Files', extensions: ['nes', 'gba', 'snes'] }]
    });

    if (!canceled) {
        return filePaths[0];  // Return the selected file path
    }

    return null;  // Return null if no file was selected
});

/**
 * Show a custom dialog.
 * @param {Object} options - The options for the custom dialog.
 * @returns {Promise<any>} A promise that resolves to the response from the dialog.
 */
ipcMain.handle('show-custom-dialog', async (event, options) => {
    dialogWindow = new BrowserWindow({
        width: 420,
        height: 475,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        }
    });

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Custom Dialog</title>
            <link rel="stylesheet" href="photon.min.css">
        </head>
        <body>
            <div id="dialog-content" class="padded">${options.content}</div>
            <div class="buttons padded centered">
                <button class="btn btn-primary" id="ok-button">OK</button>
                <button class="btn btn-negative" id="cancel-button">Cancel</button>
            </div>
            <script>
                let gameNameInput = document.getElementById('gameName');
                let gameName = gameNameInput.value;
                gameNameInput.addEventListener('input', () => {
                    gameName = gameNameInput.value;
                });
                let gameArtworkInput = document.getElementById('gameArtwork');
                let gameArtwork = gameArtworkInput.value;
                gameArtworkInput.addEventListener('input', () => {
                    gameArtwork = gameArtworkInput.value;
                }); 
                let gameDescriptionInput = document.getElementById('gameDescription');
                let gameDescription = gameDescriptionInput.value;
                gameDescriptionInput.addEventListener('input', () => {
                    gameDescription = gameDescriptionInput.value;
                });
                let gameCoreInput = document.getElementById('gameCore');
                let gameCore = gameCoreInput.value;
                gameCoreInput.addEventListener('input', () => {
                    gameCore = gameCoreInput.value;
                });
                let gamePathInput = document.getElementById('gamePath');
                let gamePath = gamePathInput.value;
                gamePathInput.addEventListener('input', () => {
                    gamePath = gamePathInput.value;
                });
                document.getElementById('ok-button').addEventListener('click', () => {
                    const game = {
                        name: gameName,
                        artwork: gameArtwork,
                        description: gameDescription,
                        core: gameCore,
                        path: gamePath
                    };
                    console.log("Updating game:", game);
                    api.sendDialogResponse(game);  // OK button clicked
                });
                document.getElementById('cancel-button').addEventListener('click', () => {
                    api.sendDialogResponse(1);  // Cancel button clicked
                });
            </script>
        </body>
        </html>
    `;
    dialogWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent), { 
      baseURLForDataURL: `file://${__dirname}/assets/`
    });

    return new Promise((resolve, reject) => {
        ipcMain.once('dialog-response', (event, response) => {
            resolve(response);
            dialogWindow.close();
        });
    });
});

// Expose scrapeArtwork function to the renderer process
ipcMain.handle('scrapeArtwork', async (event, system, gameTitle) => {
    const {found, cleanedFilename} = await scrapeArtwork(system, gameTitle);
    console.log('Found:', found, 'Filename:', cleanedFilename);
    return { found, cleanedFilename };
});