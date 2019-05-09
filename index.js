const request = require('request');
const dotenv = require('dotenv').config({path: __dirname + '/.env'});

const options = {
	json: true,
	timeout: 10000,
}

let old = console.log;

console.log = function () {
	old('[' + (new Date).toUTCString() + ']', ...arguments)
}

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

		if (!body.response){
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

		if (body.error !== false){
			console.log('Error while fetching server API information');
			return;
		}

		let servers = body.response;

		servers = servers.map((server) => (server.ip + ':' + server.port));

		callback(servers);
	});
}

function restartServer(server) {
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

setInterval(() => {
	fetchOnlineServers((online) => {
		fetchRunningServers((running) => {
			running = running.filter((i) => !online.includes(i));

			console.log('Missing servers', running);

			running.forEach((i) => restartServer(i));
		});
	});
}, 1000);