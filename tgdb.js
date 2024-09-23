const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const apiKey = process.env.TGDB_APIKEY;

const version = 'v1';
const baseURL = `https://api.thegamesdb.net/${version}/`;
const urlMethods = {
    Games: {
        fetchGamebyID: 'Games/ByGameID',
        fetchGamebyName: 'Games/ByGameName',
        fetchGamesbyPlatform: 'Games/ByPlatformID',
        fetchGameImages: 'Games/Images',
        fetchGameUpdates: 'Games/Updates',
    },
    Platforms: {
        fetchPlatforms: 'Platforms',
        fetchPlatformbyID: 'Platforms/ByPlatformID',
        fetchPlatformbyName: 'Platforms/ByPlatformName',
        fetchPlatformImages: 'Platforms/Images',
    },
    Genres: {
        fetchGenres: 'Genres',
    },
    Developers: {
        fetchDevelopers: 'Developers',
    },
    Publishers: {
        fetchPublishers: 'Publishers',
    }
};

const artworkDir = './assets/artwork'; // Directory where artwork will be saved

const searchGame = async (idType, game, system) => {
    const fields = 'id,name,release_date,platform,players,overview,genres,developers,publishers';
    if (!idType || !game) {
        throw new Error('Missing required parameters.');
    }
    let searchURL;
    switch (idType) {
        case 'id':
            searchURL = `${baseURL}${urlMethods.Games.fetchGamebyID}?apikey=${apiKey}&id=${game}&fields=${fields}`;
            break;
        case 'name':
            searchURL = `${baseURL}${urlMethods.Games.fetchGamebyName}?apikey=${apiKey}&name=${game}&fields=${fields}`;
            break;
        default:
            throw new Error('Invalid ID type.');
    }
    const response = await axios.get(searchURL);
    const searchResults = response.data;
    console.log(searchResults.data.games);
    return searchResults;
}

const getGameArt = async (gameID, type) => {
    const gameArtURL = `${baseURL}${urlMethods.Games.fetchGameImages}?apikey=${apiKey}&games_id=${gameID}&filter[type]=${type}`;
    console.log(gameArtURL);
    const validTypes = ['fanart', 'banner', 'boxart', 'screenshot', 'clearlogo', 'titlescreen'];
    if (!gameID || !type || !validTypes.includes(type)) {
        throw new Error('Missing required parameters.');
    }

    let images = await axios.get(gameArtURL);
    images = images.data;
    const imageBaseUrl = images.data.base_url.original;
    console.log('img base url:', imageBaseUrl);
    images = images.data.images[gameID]

    const downloadPromises = images.map(image => {
        const imageURL = `${imageBaseUrl}${image.filename}`;
        console.log('Downloading image:', imageURL);
        const writer = fs.createWriteStream(path.join(artworkDir, `${image.id}_${type}.png`));
        return axios({
            url: imageURL,
            method: 'GET',
            responseType: 'stream'
        }).then(response => {
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        });
    });

    return Promise.all(downloadPromises);
};

const getGameUpdates = async (gameID) => {
    const gameUpdatesURL = `${baseURL}${urlMethods.Games.fetchGameUpdates}?apikey=${apiKey}&id=${gameID}`;
    if (!gameID) {
        throw new Error('No game ID provided.');
    }
    const response = await axios.get(gameUpdatesURL);
    const updates = response.data;
    console.log(updates.data.updates);
    return updates;
}

const getGamesByPlatform = async (platformID) => {
    const gamesURL = `${baseURL}${urlMethods.Games.fetchGamesbyPlatform}?apikey=${apiKey}&id=${platformID}`;
    if (!platformID) {
        throw new Error('No platform ID provided.');
    }
    const response = await axios.get(gamesURL);
    const games = response.data;
    console.log(games.data.games);
    return games;
}

const getPlatforms = async () => { 
    const platformsURL = `${baseURL}${urlMethods.Platforms.fetchPlatforms}?apikey=${apiKey}`;
    const response = await axios.get(platformsURL);
    const platforms = response.data;
    console.log(platforms.data.platforms);
    return platforms;
}

const getPlatformGroups = async (idType, platformID) => {
    let platformURL; 
    if (!idType || !platformID) {
        throw new Error('Missing required parameters.');
    }
    if (idType === 'id') {
        platformURL = `${baseURL}${urlMethods.Platforms.fetchPlatformbyID}?apikey=${apiKey}&id=${platformID}`;
    } else if (idType === 'name') {
        platformURL = `${baseURL}${urlMethods.Platforms.fetchPlatformbyName}?apikey=${apiKey}&name=${platformID}`;
    }
    console.log("platformURL:", platformURL);
    if (!platformID) {
        throw new Error('No platform ID provided.');
    }
    const response = await axios.get(platformURL);
    const platforms = response.data;
    console.log(platforms.data.platforms);
    return platforms;
}

const getPlatformImages = async (platformID) => {
    const platformImagesURL = `${baseURL}${urlMethods.Platforms.fetchPlatformImages}?apikey=${apiKey}&platforms_id=${platformID}`;
    if (!platformID) {
        throw new Error('No platform ID provided.');
    }
    const response = await axios.get(platformImagesURL);
    const images = response.data;
    console.log(images.data.images);
    return images;
}

const getGenres = async () => {
    const genresURL = `${baseURL}${urlMethods.Genres.fetchGenres}?apikey=${apiKey}`;
    const response = await axios.get(genresURL);
    const genres = response.data;
    console.log(genres.data.genres);
    return genres;
}

const getDevelopers = async () => {
    const developersURL = `${baseURL}${urlMethods.Developers.fetchDevelopers}?apikey=${apiKey}`;
    const response = await axios.get(developersURL);
    const developers = response.data;
    console.log(developers.data.developers);
    return developers;
}

const getPublishers = async () => {
    const publishersURL = `${baseURL}${urlMethods.Publishers.fetchPublishers}?apikey=${apiKey}`;
    const response = await axios.get(publishersURL);
    const publishers = response.data;
    console.log(publishers.data.publishers);
    return publishers;
}

// const getGame = async (gameID) => {
//     const gameURL = `${baseURL}jeuInfos.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}$ssid=${devid}&sspassword=${sspassword}&output=json&romnom=${gameID}`;
//     if (!gameID) {
//         throw new Error('No game ID provided.');
//     }
//     const response = await axios.get(gameURL);
//     const gameInfo = response.data;
//     return gameInfo;
// }


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


const test = async () => {
    let game = 'Sonic The Hedgehog 2';
    let idType = 'name';
    let gameID = 142;
    let platformID = 1;
    let system = 'Genesis';

    await searchGame(idType, game, '')
    await getPlatforms();
    await getGenres();
    await getDevelopers();
    await getPublishers();
    await getGameArt(gameID, 'boxart', 'boxArtFront.png');
    await getGamesByPlatform(platformID);
    await getGameUpdates(gameID);
    await getPlatformGroups('id', platformID);
    await getPlatformImages(platformID);

}

if (require.main === module) {
    test();
}

module.exports = {
    searchGame,
    getGameArt,
    getGameUpdates,
    getGamesByPlatform,
    getPlatforms,
    getPlatformGroups,
    getPlatformImages,
    getGenres,
    getDevelopers,
    getPublishers
};

