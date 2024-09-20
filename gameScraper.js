const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();

// Global variables/constants
const baseURL = 'http://thumbnailpacks.libretro.com/'; // Base URL for Libretro thumbnail packs
const region = 'USA'; // Region of the artwork to download
const downloadDir = './assets/artwork'; // Directory where artwork will be saved

// System Mapping for Libretro thumbnail packs
const systemMapping = {
    'CPC': 'Amstrad - CPC',
    'GX4000': 'Amstrad - GX4000',
    'Arduboy': 'Arduboy Inc - Arduboy',
    '2600': 'Atari - 2600',
    '5200': 'Atari - 5200',
    '7800': 'Atari - 7800',
    'Atari8': 'Atari - 8-bit',
    'Jaguar': 'Atari - Jaguar',
    'Lynx': 'Atari - Lynx',
    'ST': 'Atari - ST',
    'Atomiswave': 'Atomiswave',
    'WonderSwan': 'Bandai - WonderSwan',
    'WSColor': 'Bandai - WonderSwan Color',
    'Cannonball': 'Cannonball',
    'CasioLoopy': 'Casio - Loopy',
    'CasioPV1000': 'Casio - PV-1000',
    'CaveStory': 'Cave Story',
    'ChaiLove': 'ChaiLove',
    'Colecovision': 'Coleco - ColecoVision',
    'C64': 'Commodore - 64',
    'Amiga': 'Commodore - Amiga',
    'CD32': 'Commodore - CD32',
    'CDTV': 'Commodore - CDTV',
    'PET': 'Commodore - PET',
    'Plus4': 'Commodore - Plus-4',
    'VIC20': 'Commodore - VIC-20',
    'Dinothawr': 'Dinothawr',
    'DOOM': 'DOOM',
    'DOS': 'DOS',
    'Emerson': 'Emerson - Arcadia 2001',
    'Entex': 'Entex - Adventure Vision',
    'Epoch': 'Epoch - Super Cassette Vision',
    'Fairchild': 'Fairchild - Channel F',
    'FBNeo': 'FBNeo - Arcade Games',
    'Flashback': 'Flashback',
    'Funtech': 'Funtech - Super Acan',
    'Vectrex': 'GCE - Vectrex',
    'GamePark': 'GamePark - GP32',
    'GB': 'Nintendo - Game Boy',
    'GBA': 'Nintendo - Game Boy Advance',
    'GBC': 'Nintendo - Game Boy Color',
    'Genesis': 'Sega - Mega Drive - Genesis',
    'GameGear': 'Sega - Game Gear',
    'HandheldElectronic': 'Handheld Electronic Games',
    'Hartung': 'Hartung - Game Master',
    'JumpnBump': 'Jump n Bump',
    'LLGS': 'LeapFrog - Leapster Learning Game System',
    'LowResNX': 'LowRes NX',
    'Lutro': 'Lutro',
    'MasterSystem': 'Sega - Master System - Mark III',
    'MegaCD': 'Sega - Mega-CD - Sega CD',
    '32X': 'Sega - 32X',
    'Dreamcast': 'Sega - Dreamcast',
    'Saturn': 'Sega - Saturn',
    'SG1000': 'Sega - SG-1000',
    'NeoGeo': 'SNK - Neo Geo',
    'NeoGeoPocket': 'SNK - Neo Geo Pocket',
    'N64': 'Nintendo - Nintendo 64',
    'NES': 'Nintendo - Nintendo Entertainment System',
    '3DS': 'Nintendo - Nintendo 3DS',
    'DS': 'Nintendo - Nintendo DS',
    'SNES': 'Nintendo - Super Nintendo Entertainment System',
    'PS1': 'Sony - PlayStation',
    'PS2': 'Sony - PlayStation 2',
    'PS3': 'Sony - PlayStation 3',
    'PSP': 'Sony - PlayStation Portable',
    'PSV': 'Sony - PlayStation Vita',
    'CDi': 'Philips - CD-i',
    'Xbox': 'Microsoft - Xbox',
    'Xbox360': 'Microsoft - Xbox 360',
    '3DO': 'The 3DO Company - 3DO',
};

// Create directory for saving artwork if it doesn't exist
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}
const mapSystemName = (system) => {
    return systemMapping[system] || systemMapping[system.toUpperCase()] || systemMapping[system.toLowerCase()] || system;
};


// Function to clean the filename
const cleanFileName = (filename) => {
    const replacements = {
        '%20': ' ',
        '%28': '(',
        '%29': ')',
        '%2C': ',',
        '%27': "'",
        '%26': '&',
        '%21': '!',
        '%2B': '+',
        '%5B': '[',
        '%5D': ']',
        '%5E': '^',
        '%7B': '{',
        '%7D': '}'
    };

    let cleaned = filename;
    for (const [encoded, decoded] of Object.entries(replacements)) {
        cleaned = cleaned.replace(new RegExp(encoded, 'g'), decoded);
    }

    return cleaned;
};

// Function to download an image
const downloadImage = async (url, filename) => {
    const cleanedFilename = cleanFileName(filename);
    const filePath = path.join(downloadDir, cleanedFilename);
    const writer = fs.createWriteStream(filePath);
    
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

// Function to scrape the system index page and find the system folder
const scrapeSystemFolder = async (system) => {
    try {
        const { data } = await axios.get(baseURL);
        const $ = cheerio.load(data);
        let systemURL = null;

        // Convert system name to match Libretro's system folder names
        let originalSystem = system;
        system = mapSystemName(system);
        console.log('Done mapping system, ' + originalSystem + ' to ' + system);

        // Find the system folder
        $('a').each((index, element) => {
            const value = $(element).text().split('/')[0];
            const href = $(element).attr('href');
            if (value === system || value == system.toUpperCase() || value == system.toLowerCase() || value.includes(system)) {
                systemURL = `${baseURL}${href}`;
                console.log(`Found system folder for ${system}: ${systemURL}`);
            }
        });

        if (!systemURL) {
            throw new Error(`System folder for ${system} not found.`);
        }

        return systemURL;

    } catch (error) {
        console.error('Error scraping system folder:', error);
    }
};

// Function to scrape the Named_Boxarts folder within the system folder, 
const scrapeNamedBoxarts = async (systemURL, gameTitle) => {
    const namedBoxartsURL = `${systemURL}Named_Boxarts/`;
    let cleanedFilename = '';
    let found = false;
    try {
        const { data } = await axios.get(namedBoxartsURL);
        const $ = cheerio.load(data);
        

        // Find all image URLs within the Named_Boxarts folder
        const links = $('a');
        for (let index = 0; index < links.length; index++) {
            const element = links[index];
            const href = $(element).attr('href');
            const value = $(element).text();

            // Check if the link matches the game title
            if (href && value.includes(gameTitle) && value.endsWith('.png') && value.includes(region)) {
                const imageUrl = `${namedBoxartsURL}${href}`;
                const filename = path.basename(imageUrl);
                cleanedFilename = cleanFileName(filename);

                console.log(`Found artwork for ${gameTitle}: ${filename}`);
                console.log(`Downloading ${filename} from ${imageUrl}...`);

                await downloadImage(imageUrl, filename);
                console.log(`${cleanedFilename} saved!`);

                found = true;
                break; // Exit the loop after downloading the first matching image
            }
        }

        if (!found) {
            console.log(`No artwork found for ${gameTitle}.`);
        }

    } catch (error) {
        console.error('Error scraping Named_Boxarts folder:', error);
    }
    return { found, cleanedFilename };
};

// Function to prompt user for game title and system
const promptUserInput = async () => {
    const gameTitle = prompt('Enter the game title: ');
    const system = prompt('Enter the system (e.g., snes, nes, genesis): ');

    return { gameTitle, system };
}

// Main function to start scraping based on user input
const main = async () => {
    const { gameTitle, system } = await promptUserInput();
    console.log(`Searching artwork for ${gameTitle} on ${system}...`);

    // Scrape system folder
    const systemURL = await scrapeSystemFolder(system);

    // Scrape the Named_Boxarts folder for the game title
    if (systemURL) {
        await scrapeNamedBoxarts(systemURL, gameTitle);
    }
};

// Function to scrape if using as a module
const scrapeArtwork = async (gameTitle, system) => {
    const systemURL = await scrapeSystemFolder(system);
    if (systemURL) {
        const returnValue = await scrapeNamedBoxarts(systemURL, gameTitle);
        return returnValue;
    }
    return { found: false, cleanedFilename: '' };
};

// Start the main function if the script is run directly
if (require.main === module) {
    main();
}

module.exports = scrapeArtwork;
