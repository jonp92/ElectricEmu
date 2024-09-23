const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const devid = process.env.SSID;
const devpassword = process.env.DEVPASSWORD;
const sspassword = process.env.SSPASSWORD;
const softname = process.env.SOFTNAME;

const baseURL = 'https://api.screenscraper.fr/api2/';
const region = 'us';
const language = 'en';
const artworkDir = './assets/artwork'; // Directory where artwork will be saved

const boxArtFront = 'box-2D';
const boxArtBack = 'box-2D-back';
const boxArtSide = 'box-2D-side';
const boxArt3D = 'box-3D';
const banner = 'screenmarquee';

const screenshotTitle = 'sstitle(wor)';
const screenshotinGame = 'ss(wor)';
const manual = 'manuel';
const logo = 'wheel-hd';

const searchGame = async (game, system) => {
    const searchURL = `${baseURL}jeuRecherche.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}&output=json&ssid=${devid}&sspassword=${sspassword}&recherche=${game}&systemeid=${system}`;

    //const searchURL = `${baseURL}jeuRecherche.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}&output=json&recherche=${game}`;

    // https://api.screenscraper.fr/api2/jeuRecherche.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test&systemeid=1&recherche=sonic
    if (!game) {
        throw new Error('No game provided.');
    }
    const response = await axios.get(searchURL);
    const searchResults = response.data;
    return searchResults;
}

const getGame = async (gameID) => {
    const gameURL = `${baseURL}jeuInfos.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}$ssid=${devid}&sspassword=${sspassword}&output=json&romnom=${gameID}`;
    if (!gameID) {
        throw new Error('No game ID provided.');
    }
    const response = await axios.get(gameURL);
    const gameInfo = response.data;
    return gameInfo;
}

const getGameArt = async (systemID, gameID, type, filename) => {
    const gameArtURL = `${baseURL}mediaJeu.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}$ssid=${devid}&sspassword=${sspassword}&crc=&md5=&sha1=&systemeid=${systemID}&jeuid=${gameID}&media=${type}`;
    console.log(gameArtURL);
    if (!systemID || !gameID || !type) {
        throw new Error('Missing required parameters.');
    }
    const writer = fs.createWriteStream(path.join(artworkDir, filename));
    const response = await axios({
        url: gameArtURL,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

const cleanHTML = (synopsis) => {
    if (!synopsis) {
        return '';
    }
    return synopsis
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&ndash;/g, '–')
        .replace(/&copy;/g, '©')
        .replace(/&reg;/g, '®')
        .replace(/&euro;/g, '€')
        .replace(/&pound;/g, '£')
        .replace(/&yen;/g, '¥')
        .replace(/&sect;/g, '§')
        .replace(/&deg;/g, '°')
        .replace(/&plusmn;/g, '±')
        .replace(/&times;/g, '×')
        .replace(/&divide;/g, '÷');
}


const main = async () => {
    const searchResults = await searchGame('Sonic The Hedgehog 2');
    const games = searchResults.response.jeux;
    let matchingName;
    let matchingSynopsis;
    for (let i = 0; i < games.length; i++) {
        matchingName = games[i].noms.find(nom => nom.region === region && nom.text === 'Sonic The Hedgehog 2');
        if (matchingName) {
            if (games[i].synopsis) {
                matchingSynopsis = games[i].synopsis.find(synopsis => synopsis.langue === language).text;
                console.log(matchingName.text, cleanHTML(matchingSynopsis));
                break;
            }
        } 
    }
}

if (require.main === module) {
    searchGame('Sonic The Hedgehog 2').then((game) => {
        let gameID = game.response.jeux[0].id;
        let systemID = game.response.jeux[0].systeme.id;
        getGameArt(systemID, gameID, screenshotTitle, 'sonic.jpg');
    }).catch((error) => {
        console.error('Error:', error);
    });
}

module.exports = { searchGame, getGame, getGameArt };