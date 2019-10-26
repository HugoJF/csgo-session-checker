# CS:GO Server Session Checker

Checks if a CS:GO server is being listed by the master server and restarts if it's too empty.

## How it works
This script works with [CS:GO Server API](https://github.com/HugoJF/csgo-server-api) and checks if each server is being listed on [Valve's Master Server](http://api.steampowered.com/ISteamApps/GetServersAtAddress/v0001?addr=0.0.0.0), and restarts it after it eaches a certain amount of players and is offline for 3 minutes.

## Requirements
  * An installation of [CS:GO Server API](https://github.com/HugoJF/csgo-server-api)
  
## Installing

Clone this repository and run:
```
npm install
```

## Configuration

Variables found inside the environment file `.env`

#### `CSGO_API_TOKEN`
[CS:GO Server API](https://github.com/HugoJF/csgo-server-api) authentication token.

#### `IP`
CS:GO server IP (is only used when querying Valve's API)
