const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { url } = require('inspector');
const path = require('path');
const prompt = require('prompt-sync')();

// Global variables/constants
const baseURL = 'https://thegamesdb.net/search.php?'; // Base URL for theGamesDB Search
const tgdbURL = 'https://thegamesdb.net'; // Base URL for theGamesDB  
const artworkDir = './assets/artwork'; // Directory where artwork will be saved

// Function to search for a game on theGamesDB
const searchForGame = async (game, system) => {
    const searchURL = `${baseURL}name=${game}`;
    const response = await axios.get(searchURL);
    const $ = cheerio.load(response.data);
    const searchResults = [];
    const urlSet = new Set(); // Set to keep track of added URLs
    
    // Loop through search results and add to searchResults array
    $('div').each((index, element) => {
        const columnDiv = $(element).find('.col-md-2');
        const innerDiv = $(columnDiv).children().first();
        const innerDivChildren = $(innerDiv).children();
        const infoDiv = $(innerDivChildren).find('.card-footer');
        const infoDivChildren = $(infoDiv).children();
        let allParagraphs = [];
        infoDivChildren.each((i, el) => {
            if ($(el).is('p')) {
                allParagraphs.push($(el).text());
            }
        });
        const titleResult = allParagraphs[0];
        const regionResult = allParagraphs[1];
        const yearResult = allParagraphs[2];
        const platformResult = allParagraphs[3];

        const a = $(innerDivChildren).first();

        let href = $(a).attr('href');
        if (href && href.startsWith('.')) {
            href = href.replace(/^\./, '');
            href = tgdbURL + href;
            if (!urlSet.has(href)) {
                urlSet.add(href);
                searchResults.push({ title: titleResult, year: yearResult, region: regionResult, platform: platformResult, url: href });
            }
        }
    });
    console.log(searchResults);
    return searchResults;
};

// Function to get game information from theGamesDB URL
const getGameInfo = async (gameURL) => {
    const response = await axios.get(gameURL);
    const $ = cheerio.load(response.data);
    const gameInfo = {};
    
    $('meta').each((index, element) => {
        const property = $(element).attr('property');
        const content = $(element).attr('content');
        const search = ['og:title', 'og:description', 'og:image'];
        if (property && content) {
            if (search.includes(property)) {
                cleanedProperty = property.replace('og:', '');
                gameInfo[cleanedProperty] = content;
            }
        }
    });

    return gameInfo; 
}

// Function to prompt user for game title and search for the game on theGamesDB
const searchGamePrompt = async () => {
    const game = prompt('Enter the name of the game you want to search for: ');
    const searchResults = await searchForGame(game);
    if (searchResults.length === 0) {
        console.log('No results found for the game:', game);
    } else {
        console.log('Search results for:', game);
        searchResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.url}`);
        });
        const gameIndex = prompt('Enter the number of the game you want to get more info on: ');
        const gameURL = searchResults[gameIndex - 1].url;
        const gameInfo = await getGameInfo(gameURL);
        console.log(gameInfo);
    }
};

// Function to download an image from a URL
const downloadImage = async (imageUrl, filename) => {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(path.join(artworkDir, filename));
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// All-in-one function to search for a game, get its info, and optionally download its artwork
const searchGame = async (game, downloadArtwork) => {
    const searchResults = await searchForGame(game);
    if (searchResults.length === 0) {
        console.log('No results found for the game:', game);
    } else {
        console.log('Search results for:', game);
        let gameInfo = searchResults[0]
        const additionalMeta = await getGameInfo(gameInfo.url)
        Object.keys(additionalMeta).forEach(key => {
            gameInfo[key] = additionalMeta[key];
        });
        console.log(`Game:`, gameInfo)
        if (downloadArtwork && additionalMeta['image']) {
            const imageURL = additionalMeta['image'];
            const filename = `${gameInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            await downloadImage(imageURL, filename);
            console.log(`Downloaded artwork for ${gameInfo.title}`);
        }
    }
}
// Main function to run the searchGamePrompt function
const main = async () => {
    await searchGamePrompt();
};

if (require.main === module) {
    searchGame('Super Mario Bros 3', true)
}

module.exports = { searchForGame, getGameInfo, downloadImage };
