const request = require('request');
const dotenv = require('dotenv').config({path: __dirname + '/.env'});
const Gamedig = require('gamedig');

const options = {
    json: true,
    timeout: 10000,
};

let old = console.log;

console.log = function () {
    old('[' + (new Date).toUTCString() + ']', ...arguments)
};

function buildRestartUrl(ip, port, command) {
    let token = process.env.CSGO_API_TOKEN;
    let url = `http://csgo-server-api.denerdtv.com/send?token=${token}&ip=${ip}&port=${port}&command=${command}`;

    return url;
}

function fetchSessionForIp(ip, callback) {
    request.get('http://api.steampowered.com/ISteamApps/GetServersAtAddress/v0001?addr=' + ip, options, callback);
}

function fetchApiServerListing(callback) {
    request.get('http://csgo-server-api.denerdtv.com/list?token=' + process.env.CSGO_API_TOKEN, options, callback);
}

function fetchOnlineServers(callback) {
    fetchSessionForIp(process.env.IP, (err, res, body) => {
        if (err) {
            console.log('Error while fetching session information');
            return;
        }

        if (!body) {
            console.log('Empty response body');
            return;
        }

        if (!body.response) {
            console.log('Invalid response');
            return;
        }

        if (body.response.success !== true) {
            console.log('Error while requesting API information');
            return;
        }

        let servers = body.response.servers;

        servers = servers.map((server) => (server.addr));

        callback(servers);
    });
}

function fetchRunningServers(callback) {
    fetchApiServerListing((err, res, body) => {
        if (err) {
            console.log('Error fetching server API');
            return;
        }

        if (!body) {
            console.log('Empty response body');
            return;
        }

        if (body.error !== false) {
            console.log('Error while fetching server API information');
            return;
        }

        let servers = body.response;

        servers = servers.map((server) => (server.ip + ':' + server.port));

        callback(servers);
    });
}

function restartServer(server) {
    delete offline[server];

    let parts = server.split(/\:/);

    if (parts.length !== 2) {
        console.log(`Error while splitting ${server}`);
        return
    }

    let url = buildRestartUrl(parts[0], parts[1], 'echo a');

    request.get(url, options, () => {
        console.log('Server restart issued to: ' + server);
    });
}

function serverOfflineForTooLong(server) {
    if (offline[server] === undefined) return false;

    let now = (new Date()).getTime();
    let offlineSince = offline[server];

    let delta = (now - offlineSince) / 1000 / 60;

    console.log(`[${server}] is offline for: ${delta} mins`);

    return delta >= 3;
}

function tooManyPlayers(server, cb) {
    let parts = server.split(/\:/);

    if (parts.length !== 2) {
        cb(true); // this is to avoid restarting
        console.log(`Failed to split ${server}: ${parts}`);
        return;
    }

    Gamedig.query({
        type: 'csgo',
        host: parts[0],
        port: parts[1]
    }).then((state) => {
        let players = state.players.length;
        let bots = state.bots.length;
        let maxPlayers = state.maxplayers;

        let humans = players - bots;

        console.log(`[${server}] Has ${players}/${maxPlayers} players (${bots})`);

        cb((humans / maxPlayers) > 0.6);
    }).catch((error) => {
        console.log(`[${server}] Server is offline: ${error}`);
        cb(false);
    });
}

function shouldRestart(server, cb) {
    // If server is not registered as offline, it should not be restarted
    if (offline[server] === undefined) {
        console.log(`[${server}] Is not registered as offline...`);
        cb(false);
        return;
    }

    // If server is not offline to too long, don't restart
    if (!serverOfflineForTooLong(server)) {
        console.log(`[${server}] Is not offline for too long`);
        cb(false);
        return;
    }

    // Check if amount of players is declining
    tooManyPlayers(server, (tooMany) => {
        if (tooMany) {
            console.log(`[${server}] has too many players, avoid restarting`);
            cb(false);
        } else {
            console.log(`[${server}] is offline for too long and has to few players. RESTARTING NOW!`);
            cb(true);
        }
    })
}

const offline = {};

setInterval(() => {
    fetchOnlineServers((online) => {
        fetchRunningServers((running) => {
            // Clean offline list if found online
            online.forEach((server) => {
                delete offline[server];
            });

            // Filter list of servers that are not online
            let missing = running.filter((i) => !online.includes(i));

            console.log('Missing servers', missing);

            // Register server as offline
            missing.forEach((server) => {
                if (offline[server] === undefined)
                    offline[server] = (new Date()).getTime();
            });

            missing.forEach((server) => {
                shouldRestart(server, (should) => {
                    if (should && false) restartServer(server);
                });
            });
        });
    });
}, 60000);