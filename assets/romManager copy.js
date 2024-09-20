document.addEventListener('DOMContentLoaded', function() {
    const romList = document.getElementById('romList');

    // Load existing ROMs from the filesystem
    function loadRomLibrary() {
        window.api.loadRoms().then(roms => {
            romList.innerHTML = ''; // Clear the list
    
            if (roms.length === 0) {
                return;
            } else {
                // Create table structure
                const table = document.createElement('table');
                table.className = 'table-striped';
    
                // Create table header
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>ROM Name</th>
                        <th></th>
                    </tr>
                `;
                table.appendChild(thead);
    
                // Create table body
                const tbody = document.createElement('tbody');
    
                roms.forEach(rom => {
                    const romRow = document.createElement('tr');
                    romRow.innerHTML = `
                        <td>${rom.name}</td>
                        <td>
                            <button class="btn btn-primary play-btn" data-path="${rom.path}">Play</button>
                            <button class="btn btn-negative delete-btn" data-name="${rom.name}">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(romRow);
                });
    
                table.appendChild(tbody);
                romList.appendChild(table);
            }
        });
    }

    // Handle file upload (open file dialog)
    document.getElementById('romUpload').addEventListener('click', () => {
        window.api.selectFile().then(file => {
            if (file) {
                const { fileName, fileData } = file;
                // Save ROM to the filesystem
                window.api.saveRom(fileName, fileData).then(() => {
                    loadRomLibrary(); // Refresh the library after saving
                });
            }
        });
    });

    // Handle Play button click
    romList.addEventListener('click', function(event) {
        if (event.target.classList.contains('play-btn')) {
            const romPath = event.target.getAttribute('data-path');
            loadRomInEmulator(romPath);
        }
    });

    // Handle Delete button click
    romList.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-btn')) {
            const romName = event.target.getAttribute('data-name');
            window.api.deleteRom(romName).then(() => {
                loadRomLibrary(); // Refresh the library after deleting
            });
        }
    });

    // Load ROM into EmulatorJS (stub function, replace with actual EmulatorJS integration)
    function loadRomInEmulator(romPath) {
        // Add logic to load the ROM file from the path into the EmulatorJS instance
        console.log('Loading ROM from path:', romPath);
        const url = romPath;
        const parts = url.split("/");
        console.log(parts);
        const filename = parts.pop();
        const core = filename.split(".").pop();
        const enableDebug = true;
        const enableThreads = false;

        const div = document.createElement("div")
        const sub = document.createElement("div")
        const script = document.createElement("script")
    
        sub.id = "game"
        div.id = "display"
    
        const top = document.getElementById("top");
        div.appendChild(sub)
        document.body.appendChild(div)

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
    }

    // Load the ROM library on page load
    loadRomLibrary();
});
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
