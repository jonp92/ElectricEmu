const enableDebug = true;
const windowPane = document.getElementById('window');
const allRomsNav = document.getElementById('allRomsNav');
const favoritesNav = document.getElementById('favoritesNav');
const bySystemNav = document.getElementById('bySystemNav');

const gameTable = document.getElementById('gameTable').querySelector('tbody');
const gameTableView = document.getElementById('gameTableView');
const gameDetailsView = document.getElementById('gameDetailsView');
const gameTableBody = document.getElementById('gameTableBody');

const gameTitle = document.getElementById('gameTitle');
const gameDescription = document.getElementById('gameDescription');
const gameArtwork = document.getElementById('gameArtwork');
const playButton = document.getElementById('playButton');
const logo = document.getElementById('logo');
const sectionTitle = document.getElementById('sectionTitle');

const newGameButton = document.getElementById('romUpload');
const openFileButton = document.getElementById('openFileButton');

const searchInput = document.getElementById('searchInput');

const toggleSwitch = document.getElementById('modeToggle');

const toolbarHeader = document.getElementsByClassName('toolbar-header')[0];
const paneSm = document.getElementsByClassName('pane-sm')[0];
const navGroupItems = document.getElementsByClassName('nav-group-item');
const navGroupTitle = document.getElementById('navGroupTitle');
const footer = document.getElementById('footer');

let gamePath = '';
let gameLibrary = {};

const libraryControls = document.getElementsByClassName('library-control');

document.addEventListener('DOMContentLoaded', function() {
    // Call the async function to load the game library on page load
    loadGameLibrary();

    // Handle category selection
    allRomsNav.addEventListener('click', () => {
        console.log('All ROMs clicked', gameLibrary);
        loadGameLibrary().then(() => populateGameTable(gameLibrary.allRoms));
        sectionTitle.innerText = 'All ROMs';
        showGameTableView();
    });

    favoritesNav.addEventListener('click', () => {
        loadGameLibrary();
        populateGameTable(gameLibrary.favorites);
        sectionTitle.innerText = 'Favorites';
        showGameTableView();
    });

    // bySystemNav.addEventListener('click', () => {
    //     loadGameLibrary();
    //     populateGameTable(gameLibrary.bySystem.gba); // Default to NES system for demo
    //     sectionTitle.innerText = 'NES Games';
    //     showGameTableView();
    // });

    // Load the "All ROMs" section by default
    // populateGameTable(gameLibrary);
    
    // Use the file dialog API to select a ROM
    openFileButton.addEventListener('click', async () => {
        const { fileName, fileData } = await window.api.selectFile();

        if (fileName) {
            console.log('File selected:', fileName);
            gamePath = fileName;
            let result = await window.api.saveRom(fileName, fileData);
            if (result) {
                loadGameLibrary().then(() => populateGameTable(gameLibrary.allRoms));
            }
            console.log('Save result:', result);
        } else {
            console.log('No file selected');
        }
    });

    // Add event listeners to library controls
    for (let i = 0; i < libraryControls.length; i++) {
        libraryControls[i].addEventListener('click', async (event) => {
            const action = libraryControls[i].dataset.action;
            let path = null
            if (libraryControls[i].dataset.path) {
                path = libraryControls[i].dataset.path;
            }
            console.log('Library control action clicked:', action);
            console.log('Library control path:', path);
            switch (action) {
                case 'delete':
                    const fileName = path.split('/').pop();
                    console.log('Deleting ROM:', path);
                    await window.api.deleteRom(fileName);
                    loadGameLibrary().then(() => populateGameTable(gameLibrary.allRoms));
                    break;
                case 'favorite':
                    await window.api.toggleFavorite(path);
                    loadGameLibrary()
                    break;
                case 'play':
                    const core = path.split('.').pop();
                    console.log('Playing ROM:', path);
                    loadGame(path, core, true, true);
                    break;
                case 'scrape':
                    console.log('Scraping metadata for game:', path);
                    const gametoScrape = gameLibrary.allRoms.find(game => game.path === path);
                    if (gametoScrape) {
                        window.api.scrapeMeta(gametoScrape.name, '', gametoScrape.path).then(
                            console.log('Scraped game:', gametoScrape.name)
                        );
                    }
                    break;
                case 'edit':
                    console.log('Editing ROM:', path);
                    const game = gameLibrary.allRoms.find(game => game.path === path);
                    if (game) {
                        const options = {
                            content: `
                                <div class="form-group row">
                                    <label for="gameName" class="col-sm-2 col-form-label">Name</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" id="gameName" value="${game.name}">
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label for="gameDescription" class="col-sm-2 col-form-label">Description</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" id="gameDescription" value="${game.description}">
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label for="gameArtwork" class="col-sm-2 col-form-label">Artwork</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" id="gameArtwork" value="${game.artwork}">
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label for="gameCore" class="col-sm-2 col-form-label">Core</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" id="gameCore" value="${game.core}">
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label for="gamePath" class="col-sm-2 col-form-label">Path</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" id="gamePath" value="${game.path}">
                                    </div>
                                </div>
                                `
                        };
                        const result = await window.api.showCustomDialog(options);
                        if (result !== 1) {
                            console.log('Editing game:', result);
                            window.api.editRom(result).then(
                                loadGameLibrary().then(() => populateGameTable(gameLibrary.allRoms))
                            );
                        }
                        console.log('Custom dialog result:', result);
                    } else {
                        console.error('Game not found in allRoms:', path);
                    }
                default:
                    break;
            }
        });
    }
    // Show a native dialog using the exposed API
    newGameButton.addEventListener('click', async () => {
        const result = await window.api.showMessageBox({
            type: 'question',
            title: 'New Game',
            message: 'Would you like to create a new game?',
            buttons: ['Yes', 'No']
        });

        // Handle the result (0 = Yes, 1 = No)
        if (result === 0) {
            console.log('New Game Created');
        } else {
            console.log('Cancelled');
        }
    });

    // Handle search input
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            showGameTableView();
            console.log('Search:', searchInput.value);
            const query = searchInput.value.toLowerCase();
            const results = gameLibrary.allRoms.filter(game => {
                return game.name.toLowerCase().includes(query);
            });
            populateGameTable(results);
        }
    });

    toggleSwitch.addEventListener('change', (event) => {
        if (event.target.checked) {
            console.log('Switch on');
            windowPane.classList.add('dark-mode');
            toolbarHeader.style.backgroundColor = '#888';
            footer.style.backgroundColor = '#888';
            footer.style.color = '#fff';
            paneSm.style.backgroundColor = '#777';
            paneSm.style.color = '#fff';
            navGroupTitle.style.color = '#fff';
            let buttons = document.getElementsByClassName('btn');
            searchInput.style.backgroundColor = '#333';
            searchInput.style.color = '#fff';
            searchInput.style.borderColor = '#444';
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i].classList.contains('btn-default')) {
                    console.log('Primary button:', buttons[i]);
                    buttons[i].classList.remove('btn-default');
                    buttons[i].classList.add('btn-custom');
                    if (buttons[i].children.length > 0) {
                        buttons[i].children[0].style.color = '#fff';
                    }
                }
            }
            for (let i = 0; i < navGroupItems.length; i++) {
                navGroupItems[i].style.color = '#fff';
                if (navGroupItems[i].children.length > 0) {
                    navGroupItems[i].children[0].style.color = '#fff';
                }
            }
        } else {
            console.log('Switch off');
            windowPane.classList.remove('dark-mode');
            toolbarHeader.style.backgroundColor = '';
            footer.style.backgroundColor = '';
            footer.style.color = '';
            paneSm.style.backgroundColor = '';
            paneSm.style.color = '';
            navGroupTitle.style.color = '';
            searchInput.style.backgroundColor = '';
            searchInput.style.color = '';
            searchInput.style.borderColor = '';
            let buttons = document.getElementsByClassName('btn');
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i].classList.contains('btn-custom')) {
                    console.log('Primary button:', buttons[i]);
                    buttons[i].classList.remove('btn-custom');
                    buttons[i].classList.add('btn-default');
                    if (buttons[i].children.length > 0) {
                        buttons[i].children[0].style.color = '';
                    }
                }
            }
            for (let i = 0; i < navGroupItems.length; i++) {
                navGroupItems[i].style.color = '';
            }
        }
    });
});
/**
 * Load the game library from the main process.
 * @returns {Promise<void>}
 */
async function loadGameLibrary() {
    try {
        gameLibrary = await window.api.loadRoms();
        gameLibrary = organizeLibrary(gameLibrary);
        populateSystemNav(gameLibrary.bySystem);
        console.log('Game library loaded:', gameLibrary);
    } catch (error) {
        console.error('Failed to load game library:', error);
    }
}

/**
 * Load a game in the emulator.
 * @param {string} url - The URL of the game.
 * @param {string} core - The core to use for the game.
 * @param {boolean} enableDebug - Whether to enable debug mode.
 * @param {boolean} enableThreads - Whether to enable threads.
 * @returns {Promise<void>}
 */
function loadGame(url, core, enableDebug, enableThreads) {
    return new Promise((resolve) => {
        const parts = url.split("/").pop().split(".");

        const box = document.createElement("div")
        const sub = document.createElement("div")
        const script = document.createElement("script")

        sub.id = "game"
        box.id = "display"

        box.remove()
        box.appendChild(sub)
        document.body.appendChild(box)

        window.EJS_player = "#game";
        window.EJS_gameName = parts.shift();
        window.EJS_biosUrl = "";
        window.EJS_gameUrl = url;
        window.EJS_core = core;
        window.EJS_pathtodata = "data/";
        window.EJS_startOnLoaded = true;
        window.EJS_DEBUG_XX = enableDebug;
        window.EJS_disableDatabases = true;
        window.EJS_threads = enableThreads;

        script.src = "data/loader.js";
        document.body.appendChild(script);
    });
}

/**
 * Organize the game library by system and favorites.
 * @param {Array} library - The game library array.
 * @returns {Object} The organized game library.
 */
function organizeLibrary(library) {
    const organizedLibrary = {
        allRoms: [],
        favorites: [],
        bySystem: {}
    };

    library.forEach(game => {
        organizedLibrary.allRoms.push(game);

        if (game.favorite) {
            organizedLibrary.favorites.push(game);
        }

        if (!organizedLibrary.bySystem[game.core]) {
            organizedLibrary.bySystem[game.core] = [];
        }

        organizedLibrary.bySystem[game.core].push(game);
    });

    return organizedLibrary;
}

/**
 * Remove text inside parentheses from game names.
 * @param {string} name - The game name.
 * @returns {string} The cleaned game name.
 */
function cleanGameName(name) {
    return name.replace(/\s*\(.*?\)\s*/g, '');
}

/**
 * Switch back to the game table view.
 */
function showGameTableView() {
    const actualTable = document.getElementById('gameTable');
    actualTable.classList.remove('hidden');
    actualTable.classList.add('visible');
    gameDetailsView.style.display = 'none';
    gameTableView.style.display = 'block';
}

/**
 * Load game details in the main pane.
 * @param {Object} game - The game object.
 */
function loadGameDetails(game) {
    // Hide game table view and show details view
    gameTableView.style.display = 'none';
    gameDetailsView.style.display = 'grid';

    // Update the game details
    gameTitle.innerText = cleanGameName(game.name);
    gameDescription.innerText = game.description;
    gameArtwork.src = game.artwork;
    const core = game.core.toLowerCase();
    console.log("PlayButton: ", playButton);
    playButton.addEventListener('click', () => {
        console.log("loadGame settings: ", game.path, core, true, false);
        loadGame(game.path, core, true, false);
    });
}

/**
 * Dynamically populate the table with games.
 * @param {Array} games - The array of game objects.
 */
function populateGameTable(games) {
    gameTableBody.innerHTML = ''; // Clear the table
    console.log('Populating game table:', games);

    games.forEach((game, index) => {
        const row = document.createElement('tr');
        const cleanedName = cleanGameName(game.name);
        row.innerHTML = `
            <td>${cleanedName}</td>
            <td>${game.description}</td>
            <td>${game.core}</td>
        `;

        // Add click event to load game details
        row.addEventListener('dblclick', () => loadGameDetails(game));
        row.addEventListener('click', () => {
            if (row.classList.contains('selected')) {
                row.classList.remove('selected');
            } else {
                const selectedRow = gameTable.querySelector('.selected');
                if (selectedRow) {
                    selectedRow.classList.remove('selected');
                }
                row.classList.add('selected');
                for (let i = 0; i < libraryControls.length; i++) {
                    libraryControls[i].dataset.path = game.path;
                }
            }
            for (let i = 0; i < libraryControls.length; i++) {
                console.log('Path:', libraryControls[i].dataset.path);
                console.log('Action:', libraryControls[i].dataset.action);
            }
        });
        gameTableBody.appendChild(row);
    });
}

/**
 * Populates the system navigation menu with a list of systems.
 * 
 * @param {Object} systems - An object where keys are system names and values are arrays of games.
 */
function populateSystemNav(systems) {
    const bySystemNav = document.getElementById('bySystemNav');
    
    // Check if the system list already exists
    if (bySystemNav.querySelector('ul')) {
        console.log('System list already exists. Skipping population.');
        return;
    }

    // Create a new unordered list to hold the system items
    const systemList = document.createElement('ul');
    systemList.classList.add('list-group');

    Object.keys(systems).forEach(system => {
        const navItem = document.createElement('li');
        navItem.classList.add('list-group-item');
        navItem.innerHTML = `
            <span class="nav-group-item">${system.toUpperCase()}</span>
        `;
        navItem.addEventListener('click', () => {
            loadGameLibrary().then(() => populateGameTable(gameLibrary.bySystem[system]));
            sectionTitle.innerText = `${system.toUpperCase()} Games`;
            showGameTableView();
        });
        systemList.appendChild(navItem);
    });

    // Append the new system list to the bySystemNav element
    bySystemNav.appendChild(systemList);
}

/**
 * Scrape artwork for a game.
 * @param {string} gameTitle - The title of the game.
 * @param {string} system - The system of the game.
 * @returns {Promise<void>}
 * 
 */
async function scrapeArtwork(gameTitle, system) {
    try {
        const { found, cleanedFilename } = await window.api.scrapeArtwork(gameTitle, system);
        console.log('Scraped artwork:', found, cleanedFilename);
        return cleanedFilename;
    }
    catch (error) {
        console.error('Failed to scrape artwork:', error);
        return null;
    }
}
        



