/**
* Managed League System by jd
* This code is far from perfect and if I was going to
* do it again I'd definitely do a lot differently.
*
* @license MIT license
*/

'use strict';

const fs = require('fs');
const Autolinker = require('autolinker');
const url = require('url');
const http = require('http');

let database = new sqlite3.Database('config/leagues.db', function () {
	database.run("CREATE TABLE IF NOT EXISTS points (date INTEGER, userid TEXT, league TEXT, points INTEGER, reason TEXT)");
});

let leagues = {};
try {
	leagues = JSON.parse(fs.readFileSync('config/leagues.json', 'utf8'));
} catch (e) {
	if (e.code !== 'ENOENT') throw e;
}

function save() {
	if (Object.keys(leagues).length < 1) return fs.writeFileSync('config/leagues.json', JSON.stringify(leagues));
	let data = "{\n";
	for (let u in leagues) {
		data += '\t"' + u + '": ' + JSON.stringify(leagues[u]) + ",\n";
	}
	data = data.substr(0, data.length - 2); // remove the last comma
	data += "\n}";
	fs.writeFileSync('config/leagues.json', data);
}

function logPoints(userid, amount, reason) {
	let leagueid = toId(getLeague(userid));
	let date = Date.now();
	userid = toId(userid);
	database.run("INSERT INTO points(date, userid, league, points, reason) VALUES ($date, $userid, $league, $points, $reason)",
		{$date: date, $userid: userid, $league: leagueid, $points: amount, $reason: reason},
		function (err) {
		    if (err) return console.log("league logPoints: " + err);
		});
}

function logPointsUser(user, league, amount, reason) {
	let leagueid = toId(league);
	let date = Date.now();
	database.run("INSERT INTO points(date, userid, league, points, reason) VALUES ($date, $userid, $league, $points, $reason)",
		{$date: date, $userid: "[" + user + "]", $league: leagueid, $points: amount, $reason: reason},
		function (err) {
		    if (err) return console.log("league logPointsUser: " + err);
		});
}

function log(message) {
	if (!message) return false;
	fs.appendFile('logs/leagues.log', '[' + new Date().toUTCString() + '] ' + message + '\n');
}

function leaguePM(message, league) {
	let leagueid = toId(league);
	if (!leagues[leagueid]) return;
	for (let u in leagues[leagueid].users) {
		if (!Users(leagues[leagueid].users[u]) || !Users(leagues[leagueid].users[u]).connected) continue;
		Users(leagues[leagueid].users[u]).send("|pm|~" + serverName + " Master|~|/raw " + message);
	}
}

function leagueLog(message, league) {
	let leagueid = toId(league);
	fs.appendFile('logs/leagues/' + leagueid + '.log', '[' + new Date().toUTCString() + '] ' + message + '\n');
}

function getBadges(user) {
	user = toId(user);
	let badges = {};
	for (let league in leagues) {
		for (let badge in leagues[league].badges) {
			if (leagues[league].badges[badge].users.includes(user)) {
				if (!badges[league]) badges[league] = [];
				badges[league].push({
					'name': leagues[league].badges[badge].title,
					'img': leagues[league].badges[badge].image,
				});
			}
		}
	}
	return (Object.keys(badges).length > 0 ? badges : false);
}
Server.getBadges = getBadges;

function getLeague(user) {
	user = toId(user);
	let reply;
	for (let league in leagues) {
		if (leagues[league].users.includes(user)) {
			reply = leagues[league].name;
			break;
		}
	}
	return reply;
}
Server.getLeague = getLeague;

function getLeagueRank(user) {
	user = toId(user);
	let league = toId(getLeague(user));
	if (!leagues[league]) return false;
	if (!league) return false;
	for (let rank in leagues[league].ranks) {
		if (leagues[league].ranks[rank].users.includes(user)) return leagues[league].ranks[rank].title;
	}
}
Server.getLeagueRank = getLeagueRank;

// Storage.importTeam from https://github.com/Zarel/Pokemon-Showdown-Client/blob/master/js/storage.js#L969

const BattleStatIDs = {HP: "hp", hp: "hp", Atk: "atk", atk: "atk", Def: "def", def: "def", SpA: "spa", SAtk: "spa", SpAtk: "spa", spa: "spa", SpD: "spd", SDef: "spd", SpDef: "spd", spd: "spd", Spe: "spe", Spd: "spe", spe: "spe"};
const BattleTypeChart = {Bug: {damageTaken: {Bug: 0, Dark: 0, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 2, Fire: 1, Flying: 1, Ghost: 0, Grass: 2, Ground: 2, Ice: 0, Normal: 0, Poison: 0, Psychic: 0, Rock: 1, Steel: 0, Water: 0}, HPivs: {atk: 30, def: 30, spd: 30}, HPdvs: {atk: 13, def: 13}}, Dark: {damageTaken: {Bug: 1, Dark: 2, Dragon: 0, Electric: 0, Fairy: 1, Fighting: 1, Fire: 0, Flying: 0, Ghost: 2, Grass: 0, Ground: 0, Ice: 0, Normal: 0, Poison: 0, Psychic: 3, Rock: 0, Steel: 0, Water: 0}, HPivs: {}}, Dragon: {damageTaken: {Bug: 0, Dark: 0, Dragon: 1, Electric: 2, Fairy: 1, Fighting: 0, Fire: 2, Flying: 0, Ghost: 0, Grass: 2, Ground: 0, Ice: 1, Normal: 0, Poison: 0, Psychic: 0, Rock: 0, Steel: 0, Water: 2}, HPivs: {atk: 30}, HPdvs: {def: 14}}, Electric: {damageTaken: {par: 3, Bug: 0, Dark: 0, Dragon: 0, Electric: 2, Fairy: 0, Fighting: 0, Fire: 0, Flying: 2, Ghost: 0, Grass: 0, Ground: 1, Ice: 0, Normal: 0, Poison: 0, Psychic: 0, Rock: 0, Steel: 2, Water: 0}, HPivs: {spa: 30}, HPdvs: {atk: 14}}, Fairy: {damageTaken: {Bug: 2, Dark: 2, Dragon: 3, Electric: 0, Fairy: 0, Fighting: 2, Fire: 0, Flying: 0, Ghost: 0, Grass: 0, Ground: 0, Ice: 0, Normal: 0, Poison: 1, Psychic: 0, Rock: 0, Steel: 1, Water: 0}}, Fighting: {damageTaken: {Bug: 2, Dark: 2, Dragon: 0, Electric: 0, Fairy: 1, Fighting: 0, Fire: 0, Flying: 1, Ghost: 0, Grass: 0, Ground: 0, Ice: 0, Normal: 0, Poison: 0, Psychic: 1, Rock: 2, Steel: 0, Water: 0}, HPivs: {def: 30, spa: 30, spd: 30, spe: 30}, HPdvs: {atk: 12, def: 12}}, Fire: {damageTaken: {brn: 3, Bug: 2, Dark: 0, Dragon: 0, Electric: 0, Fairy: 2, Fighting: 0, Fire: 2, Flying: 0, Ghost: 0, Grass: 2, Ground: 1, Ice: 2, Normal: 0, Poison: 0, Psychic: 0, Rock: 1, Steel: 2, Water: 1}, HPivs: {atk: 30, spa: 30, spe: 30}, HPdvs: {atk: 14, def: 12}}, Flying: {damageTaken: {Bug: 2, Dark: 0, Dragon: 0, Electric: 1, Fairy: 0, Fighting: 2, Fire: 0, Flying: 0, Ghost: 0, Grass: 2, Ground: 3, Ice: 1, Normal: 0, Poison: 0, Psychic: 0, Rock: 1, Steel: 0, Water: 0}, HPivs: {hp: 30, atk: 30, def: 30, spa: 30, spd: 30}, HPdvs: {atk: 12, def: 13}}, Ghost: {damageTaken: {trapped: 3, Bug: 2, Dark: 1, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 3, Fire: 0, Flying: 0, Ghost: 1, Grass: 0, Ground: 0, Ice: 0, Normal: 3, Poison: 2, Psychic: 0, Rock: 0, Steel: 0, Water: 0}, HPivs: {def: 30, spd: 30}, HPdvs: {atk: 13, def: 14}}, Grass: {damageTaken: {powder: 3, Bug: 1, Dark: 0, Dragon: 0, Electric: 2, Fairy: 0, Fighting: 0, Fire: 1, Flying: 1, Ghost: 0, Grass: 2, Ground: 2, Ice: 1, Normal: 0, Poison: 1, Psychic: 0, Rock: 0, Steel: 0, Water: 2}, HPivs: {atk: 30, spa: 30}, HPdvs: {atk: 14, def: 14}}, Ground: {damageTaken: {sandstorm: 3, Bug: 0, Dark: 0, Dragon: 0, Electric: 3, Fairy: 0, Fighting: 0, Fire: 0, Flying: 0, Ghost: 0, Grass: 1, Ground: 0, Ice: 1, Normal: 0, Poison: 2, Psychic: 0, Rock: 2, Steel: 0, Water: 1}, HPivs: {spa: 30, spd: 30}, HPdvs: {atk: 12}}, Ice: {damageTaken: {hail: 3, frz: 3, Bug: 0, Dark: 0, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 1, Fire: 1, Flying: 0, Ghost: 0, Grass: 0, Ground: 0, Ice: 2, Normal: 0, Poison: 0, Psychic: 0, Rock: 1, Steel: 1, Water: 0}, HPivs: {atk: 30, def: 30}, HPdvs: {def: 13}}, Normal: {damageTaken: {Bug: 0, Dark: 0, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 1, Fire: 0, Flying: 0, Ghost: 3, Grass: 0, Ground: 0, Ice: 0, Normal: 0, Poison: 0, Psychic: 0, Rock: 0, Steel: 0, Water: 0}}, Poison: {damageTaken: {psn: 3, tox: 3, Bug: 2, Dark: 0, Dragon: 0, Electric: 0, Fairy: 2, Fighting: 2, Fire: 0, Flying: 0, Ghost: 0, Grass: 2, Ground: 1, Ice: 0, Normal: 0, Poison: 2, Psychic: 1, Rock: 0, Steel: 0, Water: 0}, HPivs: {def: 30, spa: 30, spd: 30}, HPdvs: {atk: 12, def: 14}}, Psychic: {damageTaken: {Bug: 1, Dark: 1, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 2, Fire: 0, Flying: 0, Ghost: 1, Grass: 0, Ground: 0, Ice: 0, Normal: 0, Poison: 0, Psychic: 2, Rock: 0, Steel: 0, Water: 0}, HPivs: {atk: 30, spe: 30}, HPdvs: {def: 12}}, Rock: {damageTaken: {sandstorm: 3, Bug: 0, Dark: 0, Dragon: 0, Electric: 0, Fairy: 0, Fighting: 1, Fire: 2, Flying: 2, Ghost: 0, Grass: 1, Ground: 1, Ice: 0, Normal: 2, Poison: 2, Psychic: 0, Rock: 0, Steel: 1, Water: 1}, HPivs: {def: 30, spd: 30, spe: 30}, HPdvs: {atk: 13, def: 12}}, Steel: {damageTaken: {psn: 3, tox: 3, sandstorm: 3, Bug: 2, Dark: 0, Dragon: 2, Electric: 0, Fairy: 2, Fighting: 1, Fire: 1, Flying: 2, Ghost: 0, Grass: 2, Ground: 1, Ice: 2, Normal: 2, Poison: 3, Psychic: 2, Rock: 2, Steel: 2, Water: 0}, HPivs: {spd: 30}, HPdvs: {atk: 13}}, Water: {damageTaken: {Bug: 0, Dark: 0, Dragon: 0, Electric: 1, Fairy: 0, Fighting: 0, Fire: 2, Flying: 0, Ghost: 0, Grass: 1, Ground: 0, Ice: 2, Normal: 0, Poison: 0, Psychic: 0, Rock: 0, Steel: 2, Water: 2}, HPivs: {atk: 30, def: 30, spa: 30}, HPdvs: {atk: 14, def: 13}}};

function importTeam(text) {
	text = text.split("\n");
	let team = [];
	let curSet = null;

	for (let i = 0; i < text.length; i++) {
		let line = text[i].trim();
		if (line === '' || line === '---') {
			curSet = null;
		} else if (line.substr(0, 3) === '===') {
			team = [];
			line = line.substr(3, line.length - 6).trim();
			let bracketIndex = line.indexOf(']');
			if (bracketIndex >= 0) {
				line = line.substr(bracketIndex + 1).trim();
			}
			let slashIndex = line.lastIndexOf('/');
			if (slashIndex > 0) {
				line = line.slice(slashIndex + 1);
			}
		} else if (!curSet) {
			curSet = {name: '', species: '', gender: ''};
			team.push(curSet);
			let atIndex = line.lastIndexOf(' @ ');
			if (atIndex !== -1) {
				curSet.item = line.substr(atIndex + 3);
				if (toId(curSet.item) === 'noitem') curSet.item = '';
				line = line.substr(0, atIndex);
			}
			if (line.substr(line.length - 4) === ' (M)') {
				curSet.gender = 'M';
				line = line.substr(0, line.length - 4);
			}
			if (line.substr(line.length - 4) === ' (F)') {
				curSet.gender = 'F';
				line = line.substr(0, line.length - 4);
			}
			let parenIndex = line.lastIndexOf(' (');
			if (line.substr(line.length - 1) === ')' && parenIndex !== -1) {
				line = line.substr(0, line.length - 1);
				curSet.species = Dex.getTemplate(line.substr(parenIndex + 2)).species;
				line = line.substr(0, parenIndex);
				curSet.name = line;
			} else {
				curSet.species = Dex.getTemplate(line).species;
				curSet.name = '';
			}
		} else if (line.substr(0, 7) === 'Trait: ') {
			line = line.substr(7);
			curSet.ability = line;
		} else if (line.substr(0, 9) === 'Ability: ') {
			line = line.substr(9);
			curSet.ability = line;
		} else if (line === 'Shiny: Yes') {
			curSet.shiny = true;
		} else if (line.substr(0, 7) === 'Level: ') {
			line = line.substr(7);
			curSet.level = +line;
		} else if (line.substr(0, 11) === 'Happiness: ') {
			line = line.substr(11);
			curSet.happiness = +line;
		} else if (line.substr(0, 9) === 'Ability: ') {
			line = line.substr(9);
			curSet.ability = line;
		} else if (line.substr(0, 5) === 'EVs: ') {
			line = line.substr(5);
			let evLines = line.split('/');
			curSet.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
			for (let j = 0; j < evLines.length; j++) {
				let evLine = evLines[j].trim();
				let spaceIndex = evLine.indexOf(' ');
				if (spaceIndex === -1) continue;
				let statid = BattleStatIDs[evLine.substr(spaceIndex + 1)];
				let statval = parseInt(evLine.substr(0, spaceIndex));
				if (!statid) continue;
				curSet.evs[statid] = statval;
			}
		} else if (line.substr(0, 5) === 'IVs: ') {
			line = line.substr(5);
			let ivLines = line.split(' / ');
			curSet.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
			for (let j = 0; j < ivLines.length; j++) {
				let ivLine = ivLines[j];
				let spaceIndex = ivLine.indexOf(' ');
				if (spaceIndex === -1) continue;
				let statid = BattleStatIDs[ivLine.substr(spaceIndex + 1)];
				let statval = parseInt(ivLine.substr(0, spaceIndex));
				if (!statid) continue;
				if (isNaN(statval)) statval = 31;
				curSet.ivs[statid] = statval;
			}
		} else if (line.match(/^[A-Za-z]+ (N|n)ature/)) {
			let natureIndex = line.indexOf(' Nature');
			if (natureIndex === -1) natureIndex = line.indexOf(' nature');
			if (natureIndex === -1) continue;
			line = line.substr(0, natureIndex);
			if (line !== 'undefined') curSet.nature = line;
		} else if (line.substr(0, 1) === '-' || line.substr(0, 1) === '~') {
			line = line.substr(1);
			if (line.substr(0, 1) === ' ') line = line.substr(1);
			if (!curSet.moves) curSet.moves = [];
			if (line.substr(0, 14) === 'Hidden Power [') {
				let hptype = line.substr(14, line.length - 15);
				line = 'Hidden Power ' + hptype;
				if (!curSet.ivs && BattleTypeChart) {
					curSet.ivs = {};
					for (let stat in BattleTypeChart[hptype].HPivs) {
						curSet.ivs[stat] = BattleTypeChart[hptype].HPivs[stat];
					}
				}
			}
			if (line === 'Frustration') {
				curSet.happiness = 0;
			}
			curSet.moves.push(line);
		}
	}
	return team;
}

function packTeam(team) {
	let buf = '';
	if (!team) return '';

	for (let i = 0; i < team.length; i++) {
		let set = team[i];
		if (buf) buf += ']';

		// name
		buf += set.name;

		// species
		let id = toId(set.species);
		buf += '|' + (toId(set.name) === id ? '' : id);

		// item
		buf += '|' + toId(set.item);

		// ability
		let template = Dex.getTemplate(set.species || set.name);
		let abilities = template.abilities;
		id = toId(set.ability);
		if (abilities) {
			if (id === toId(abilities['0'])) {
				buf += '|';
			} else if (id === toId(abilities['1'])) {
				buf += '|1';
			} else if (id === toId(abilities['H'])) {
				buf += '|H';
			} else {
				buf += '|' + id;
			}
		} else {
			buf += '|' + id;
		}

		// moves
		if (set.moves) {
			buf += '|' + set.moves.map(toId).join(',');
		} else {
			buf += '|';
		}

		// nature
		buf += '|' + (set.nature || '');

		// evs
		let evs = '|';
		if (set.evs) {
			evs = '|' + (set.evs['hp'] || '') + ',' + (set.evs['atk'] || '') + ',' + (set.evs['def'] || '') + ',' + (set.evs['spa'] || '') + ',' + (set.evs['spd'] || '') + ',' + (set.evs['spe'] || '');
		}
		if (evs === '|,,,,,') {
			buf += '|';
			// doing it this way means packTeam doesn't need to be past-gen aware
			if (set.evs['hp'] === 0) buf += '0';
		} else {
			buf += evs;
		}

		// gender
		if (set.gender && set.gender !== template.gender) {
			buf += '|' + set.gender;
		} else {
			buf += '|';
		}

		// ivs
		let ivs = '|';
		if (set.ivs) {
			ivs = '|' + (set.ivs['hp'] === 31 || set.ivs['hp'] === undefined ? '' : set.ivs['hp']) + ',' + (set.ivs['atk'] === 31 || set.ivs['atk'] === undefined ? '' : set.ivs['atk']) + ',' + (set.ivs['def'] === 31 || set.ivs['def'] === undefined ? '' : set.ivs['def']) + ',' + (set.ivs['spa'] === 31 || set.ivs['spa'] === undefined ? '' : set.ivs['spa']) + ',' + (set.ivs['spd'] === 31 || set.ivs['spd'] === undefined ? '' : set.ivs['spd']) + ',' + (set.ivs['spe'] === 31 || set.ivs['spe'] === undefined ? '' : set.ivs['spe']);
		}
		if (ivs === '|,,,,,') {
			buf += '|';
		} else {
			buf += ivs;
		}

		// shiny
		if (set.shiny) {
			buf += '|S';
		} else {
			buf += '|';
		}

		// level
		if (set.level && set.level !== 100) {
			buf += '|' + set.level;
		} else {
			buf += '|';
		}

		// happiness
		if (set.happiness !== undefined && set.happiness !== 255) {
			buf += '|' + set.happiness;
		} else {
			buf += '|';
		}
	}

	return buf;
}

function getTeam(link, callback) {
	link = url.parse(link);

	if (link.host !== 'pastebin.com') return callback("That's not a valid pastebin url.");
	if (!link.path.includes('raw')) link.path = "/raw" + link.path;

	let options = {
		host: link.host,
		port: 80,
		path: link.path,
		method: 'GET',
	};
	http.get(options, function (res) {
		let data = '';
		res.on('data', function (chunk) {
			data += chunk;
		}).on('end', function () {
			let team = packTeam(importTeam(data));
			if (!team) return callback("Error fetching your team.");
			return callback(false, team);
		});
	});
}
Server.getTeam = getTeam;

function isOdd(number) {
	return (number % 2) === 1;
}

function hasPermission(user, permission) {
	let league = leagues[toId(getLeague(user))];
	if (!league) return false;
	let rank = toId(getLeagueRank(user));
	if (league.ranks[rank].permissions['all']) return true;
	if (league.ranks[rank].permissions[permission]) return true;
	return false;
}

const permissionList = {
	all: true,
	invite: true,
	kick: true,
	desc: true,
	masspm: true,
	promote: true,
	manageranks: true,
	lvl: true,
	icon: true,
};

if (!Rooms.global.pendingLvL) Rooms.global.pendingLvL = {};
if (!Rooms.global.LvL) Rooms.global.LvL = {};
if (!Rooms.global.pendingLvLRooms) Rooms.global.pendingLvLRooms = {};

let typeChart = {
	"bug": "Bug", "dark": "Dark", "dragon": "Dragon", "electric": "Electric",
	"fairy": "Fairy", "fighting": "Fighting", "fire": "Fire", "flying": "Flying",
	"ghost": "Ghost", "grass": "Grass", "ground": "Ground", "ice": "Ice", "normal": "Normal",
	"poison": "Poison", "psychic": "Psychic", "rock": "Rock", "steel": "Steel", "water": "Water",
};

function formatType(type) {
	type = toId(type);
	type = typeChart[type];
	return type;
}

function leagueTourPoints(winner, runnerup, tourSize, room) {
	let winnerLeague = toId(getLeague(winner));
	let secondLeague = toId(getLeague(runnerup));
	let winnerPoints = Math.round(tourSize / 2);
	let secondPoints = Math.round(winnerPoints / 2);
	if (winnerLeague && winnerPoints > 0) {
		leagues[winnerLeague].points += winnerPoints;
		save();
		logPoints(winner, winnerPoints, "First place in a tournament in " + room.id);
		room.addRaw("<b>" + Server.nameColor(winner, true) + " has won " + winnerPoints + (winnerPoints === 1 ? " point " : " points ") + " for " + Chat.escapeHTML(leagues[winnerLeague].name) + "</b>");
	}
	if (secondLeague && secondPoints > 0) {
		leagues[secondLeague].points += secondPoints;
		save();
		logPoints(runnerup, secondPoints, "Second place in a tournament in " + room.id);
		room.addRaw("<b>" + Server.nameColor(runnerup, true) + " has won " + secondPoints + (secondPoints === 1 ? " point " : " points ") + " for " + Chat.escapeHTML(leagues[secondLeague].name) + "</b>");
	}
}
Server.leagueTourPoints = leagueTourPoints;

function isLvLBattle(p1, p2, id, status, types, score) {
	let leagueId = toId(getLeague(p1));
	if (!leagueId) return;
	let targetLeagueid = toId(getLeague(p2));
	if (!targetLeagueid) return;

	if (!Rooms.global.LvL[leagueId]) return;
	if (Rooms.global.LvL[leagueId] && Rooms.global.LvL[leagueId].challenger && Rooms.global.LvL[leagueId].challenger === targetLeagueid || Rooms.global.LvL[leagueId] && Rooms.global.LvL[leagueId].challenging && Rooms.global.LvL[leagueId].challenging === targetLeagueid) {
		let room = Rooms(Rooms.global.LvL[leagueId].room);
		if (!room.lvl.started) return;
		if (room.lvl.mode === "normal") {
			if (room.lvl.leagues[0].players[room.lvl.statusNumber] !== p1 && room.lvl.leagues[1].players[room.lvl.statusNumber] !== p1 || room.lvl.leagues[0].players[room.lvl.statusNumber] !== p2 && room.lvl.leagues[1].players[room.lvl.statusNumber] !== p2) return;
		} else {
			if ((!room.lvl.leagues[0].players.includes(p1) && !room.lvl.leagues[1].players.includes(p1)) && (!room.lvl.leagues[0].includes(p2) && !room.lvl.leagues[1].includes(p2))) return;
		}

		if (status === 'start') {
			if (room.lvl.mode === "normal") {
				if (room.lvl.status[room.lvl.statusNumber] !== 2) return;
				room.lvl.status[room.lvl.statusNumber] = id;
			} else {
				let statusNumber = room.lvl.leagues[(room.lvl.leagues[0].players.includes(p1) ? 0 : 1)].players.indexOf(p1);
				if (room.lvl.status[statusNumber] !== 2) return;
				room.lvl.status[statusNumber] = id;
			}
			lvlDisplay(room);
			room.add('|raw|<a href="/' + id + '">The League vs League battle between ' + Server.nameColor(p1, true) + ' (' + Chat.escapeHTML(leagues[leagueId].name) + ') and ' +
				Server.nameColor(p2, true) + ' (' + Chat.escapeHTML(leagues[targetLeagueid].name) + ') has begun.</a>');
		} else if (status === 'types') {
			if (room.lvl.mode === "normal") {
				room.lvl.types[room.lvl.statusNumber] = types;
			} else {
				let statusNumber = room.lvl.leagues[(room.lvl.leagues[0].players.includes(p1) ? 0 : 1)].players.indexOf(p1);
				room.lvl.types[statusNumber] = types;
			}
			lvlDisplay(room);
		} else if (status.substr(0, 2) === 'p-') {
			status = status.slice(2);
			if (room.lvl.mode === "normal") {
				if (room.lvl.status[room.lvl.statusNumber] !== id) return;
				let player = (room.lvl.leagues[0].players[room.lvl.statusNumber] === status ? 0 : 1);
				room.lvl.status[room.lvl.statusNumber] = player;
				room.lvl.leagues[room.lvl.status[room.lvl.statusNumber]].wins++;
				room.lvl.statusNumber++;

				if (room.lvl.status[room.lvl.statusNumber]) {
					room.lvl.status[room.lvl.statusNumber] = 2;
					lvlDisplay(room);
				} else {
					lvlDisplay(room);
					// end
					let winner = room.lvl.leagues[0].name;
					let loser = room.lvl.leagues[1].name;
					if (room.lvl.leagues[1].wins > room.lvl.leagues[0].wins) {
						winner = room.lvl.leagues[1].name;
						loser = room.lvl.leagues[0].name;
					}
					let points = Math.round((room.lvl.size * 5) / 3);
					room.add('|raw|' +
						'<div class="infobox">Congratulations ' + Chat.escapeHTML(winner) + '. You have won the League vs League! You have been awarded ' +
						points + ' League Points.</div>'
					);
					room.update();
					leagues[toId(winner)].points += points;
					save();
					logPointsUser("LvL", toId(winner), points, "Won League vs League against " + loser + ".");
					delete Rooms.global.LvL[toId(room.lvl.leagues[0].name)];
					delete Rooms.global.LvL[toId(room.lvl.leagues[1].name)];
					delete room.lvl;
				}
			} else {
				let statusNumber = room.lvl.leagues[(room.lvl.leagues[0].players.includes(p1) ? 0 : 1)].players.indexOf(p1);
				if (room.lvl.status[statusNumber] !== id) return;
				let player = (room.lvl.leagues[0].players[statusNumber] === status ? 0 : 1);
				room.lvl.status[statusNumber] = player;
				room.lvl.leagues[room.lvl.status[statusNumber]].wins++;

				let finished = true;
				for (let u in room.lvl.status) {
					if (room.lvl.status[u] !== 0 && room.lvl.status[u] !== 1) finished = false;
				}

				if (finished) {
					lvlDisplay(room);
					// end
					let winner = room.lvl.leagues[0].name;
					let loser = room.lvl.leagues[1].name;
					if (room.lvl.leagues[1].wins > room.lvl.leagues[0].wins) {
						winner = room.lvl.leagues[1].name;
						loser = room.lvl.leagues[0].name;
					}
					let points = Math.round((room.lvl.size * 5) / 3);
					room.add('|raw|' +
						'<div class="infobox">Congratulations ' + Chat.escapeHTML(winner) + '. You have won the League vs League! You have been awarded ' +
						points + ' League Points.</div>'
					);
					room.update();
					leagues[toId(winner)].points += points;
					save();
					logPointsUser("LvL", toId(winner), points, "Won League vs League against " + loser + ".");
					delete Rooms.global.LvL[toId(room.lvl.leagues[0].name)];
					delete Rooms.global.LvL[toId(room.lvl.leagues[1].name)];
					delete room.lvl;
				} else {
					lvlDisplay(room);
				}
			}
		} else if (status === 'tie') {
			if (room.lvl.mode === "normal") {
				room.lvl.status[room.lvl.statusNumber] = 2;
			} else {
				let statusNumber = room.lvl.leagues[(room.lvl.leagues[0].players.includes(p1) ? 0 : 1)].players.indexOf(p1);
				room.lvl.status[statusNumber] = 2;
			}
			lvlDisplay(room);
			room.add("|raw|The League vs League battle between " + Server.nameColor(p1, true) + " and " + Server.nameColor(p2, true) + " ended with a tie. They have to have a rematch.");
			room.update();
		}
	}
}
Server.isLvLBattle = isLvLBattle;

function lvlDisplay(room) {
	let output = '';
	output += '<center><font size="6">League vs League</font><br />';
	output += '<font color="grey"><small>(experimental - report any bugs to jd or Tailz)</small></font>';
	output += '<font color="grey"><small>(' + room.lvl.size + 'v' + room.lvl.size + ') (mode: ' + Chat.escapeHTML(room.lvl.mode) + ')</small></font><br /><br />';
	output += '<table><tr><th><font size="5">' + Chat.escapeHTML(room.lvl.leagues[0].name) + '</font></th><td>vs</td><th><font size="5">' + Chat.escapeHTML(room.lvl.leagues[1].name) + '</font></th></tr>';

	if (room.lvl.leagues[0].players.length === room.lvl.size && room.lvl.leagues[1].players.length === room.lvl.size && !room.lvl.started) {
		let notOnline = [];
		for (let u in room.lvl.leagues[0].players) {
			let curPlayer = room.lvl.leagues[0].players[u];
			if (!Users(curPlayer) || !Users(curPlayer).connected) {
				notOnline.push(curPlayer);
				continue;
			}
		}

		for (let u in room.lvl.leagues[1].players) {
			let curPlayer = room.lvl.leagues[1].players[u];
			if (!Users(curPlayer) || !Users(curPlayer).connected) {
				notOnline.push(curPlayer);
				continue;
			}
		}

		if (notOnline.length > 0) {
			for (let u in notOnline) {
				if (room.lvl.leagues[0].players.includes(notOnline[u])) {
					room.lvl.leagues[0].players.splice(room.lvl.leagues[0].players.indexOf(notOnline[u]), 1);
				} else {
					room.lvl.leagues[1].players.splice(room.lvl.leagues[1].players.indexOf(notOnline[u]), 1);
				}
			}
			room.add("The following players have been removed from the League vs League due to not being online: " + notOnline.join(', '));
		} else {
			room.lvl.started = true;
			Dex.shuffle(room.lvl.leagues[0].players);
			Dex.shuffle(room.lvl.leagues[1].players);
			room.add("The League vs League has started!");
			room.lvl.status[0] = 2;
		}
	}

	if (!room.lvl.started) {
		output += '<tr><td>Joined: ' + room.lvl.leagues[0].players.length + '</td><td><td>Joined: ' + room.lvl.leagues[1].players.length + '</td></tr>';
		output += '<tr><td colspan="3"><center><button name="send" value="/league lvl join">Join</button></center></td></tr>';
	} else {
		for (let u in room.lvl.leagues[0].players) {
			output += '<tr>';
			switch (room.lvl.status[u]) {
			case 0:
				output += '<td><font color="green"><center>' + room.lvl.leagues[0].players[u] + '</center></font></td>';
				output += '<td>vs</td>';
				output += '<td><font color="red"><center>' + room.lvl.leagues[1].players[u] + '</center></font></td>';
				break;
			case 1:
				output += '<td><font color="red"><center>' + room.lvl.leagues[0].players[u] + '</center></font></td>';
				output += '<td>vs</td>';
				output += '<td><font color="green"><center>' + room.lvl.leagues[1].players[u] + '</center></font></td>';
				break;
			case 2:
				output += '<td><center><b>' + room.lvl.leagues[0].players[u] + '</b></center></td>';
				output += '<td>vs</td>';
				output += '<td><center><b>' + room.lvl.leagues[1].players[u] + '</b></center></td>';
				break;
			case 3:
				output += '<td><center>' + room.lvl.leagues[0].players[u] + '</center></td>';
				output += '<td>vs</td>';
				output += '<td><center>' + room.lvl.leagues[1].players[u] + '</center></td>';
				break;
			default:
				output += '<td><center><a href="/' + Chat.escapeHTML(room.lvl.status[u]) + '">' + room.lvl.leagues[0].players[u] + '</a>' + (room.lvl.types[room.lvl.statusNumber] ? formatType(room.lvl.types[room.lvl.statusNumber][0]) : '') + '</center></td>';
				output += '<td>vs</td>';
				output += '<td><center><a href="/' + Chat.escapeHTML(room.lvl.status[u]) + '">' + room.lvl.leagues[1].players[u] + '</a>' + (room.lvl.types[room.lvl.statusNumber] ? formatType(room.lvl.types[room.lvl.statusNumber][1]) : '') + '</center></td>';
				break;
			}
			output += '</tr>';
		}
	}
	output += '</table>';

	room.add('|uhtmlchange|RvR-' + room.lvl.lvlId + '|');
	room.add('|uhtml|RvR-' + room.lvl.lvlId + '|<div class="infobox">' + output + '</div>');
	room.update();
}
Server.lvlDisplay = lvlDisplay;

exports.commands = {
	guild: 'guilds',
	guilds: {
		create: function (target, room, user) {
			if (!this.can('eval')) return false;
			if (!target) return this.errorReply("Usage: /guild create [guild name], [user]");
			let targets = target.split(',');
			for (let u in targets) targets[u] = targets[u].trim();

			if (!targets[0]) return this.errorReply("Usage: /guild create [guild name], [user]");
			if (!targets[1]) return this.errorReply("Usage: /guild create [guild name], [user]");

			let leagueid = toId(targets[0]);
			let leagueName = targets[0];
			let targetUser = Users(targets[1]);

			if (leagueid.length < 1) return this.errorReply("Guild names must be at least one character long.");
			if (leagueid.length > 30 || leagueName.length > 30) return this.errorReply("Guild names may not be longer than 30 characters.");
			if (leagues[leagueid]) return this.errorReply("Guild already exists.");
			if (!targetUser || !targetUser.connected) return this.errorReply('"' + targets[1] + '" is not currently online.');

			leagues[leagueid] = {
				name: leagueName,
				id: leagueid,
				pendingInvites: [],
				points: 0,
				desc: "",
				icon: "",
				/*badges: {},*/
				users: [targetUser.userid],
				ranks: {
					'grandmaster': {
						title: 'Grand Master',
						users: [targetUser.userid],
						permissions: {
							all: true,
						},
						sortBy: 100,
					},
					'masters': {
						title: 'Masters',
						users: [],
						permissions: {
							invite: true,
							kick: true,
							desc: true,
							masspm: true,
							promote: true,
							manageranks: true,
						},
						sortBy: 8,
					},
					'champions': {
						title: 'Champions',
						users: [],
						permissions: {
							lvl: true,
						},
						sortBy: 6,
					},
					'elite': {
						title: 'Elite',
						users: [],
						permissions: {
							givebadge: true,
						},
						sortBy: 4,
					},
					'commeners': {
						title: 'Commeners',
						users: [],
						permissions: {},
						sortBy: 2,
					},
				},
			};
			save();
			fs.writeFile('./logs/leagues/' + leagueid + '.log');
			log(user.name + " has created the guild '" + leagueName + "'.");
			this.sendReply("You've created the guild \"" + leagueName + "\".");
		},

		delete: function (target, room, user) {
			if (!this.can('eval')) return false;
			if (!target) return this.errorReply("Usage: /guild delete [guild name].");
			if (!leagues[toId(target)]) return this.errorReply("Guild does not exist.");

			delete leagues[toId(target)];
			save();
			log(user.name + " has deleted the guild '" + target + "'.");
			this.sendReply("You've deleted the guild '" + target + '".');
		},

		invite: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild invite [user] - Invites a user to your league.");

			let leagueid = toId(getLeague(user.userid));
			let targetUser = Users(target);
			if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
			if (!targetUser || !targetUser.connected) return this.errorReply("That user is not currently online.");
			if (leagues[leagueid].users.includes(targetUser.userid)) return this.errorReply("That user is already in your guild.");
			if (leagues[leagueid].pendingInvites.includes(targetUser.userid)) return this.errorReply("There's already a pending invitation for that user to join your guild.");

			for (let league in leagues) {
				if (leagues[league].id === leagueid) continue;
				if (leagues[league].users.includes(targetUser.userid)) return this.errorReply("That user is a member of " + leagues[league].name + ".");
			}

			if (!hasPermission(user.userid, 'invite')) return this.errorReply("You don't have permission to invite users to " + target + ".");

			leagues[leagueid].pendingInvites.push(targetUser.userid);
			save();
			leagueLog(user.name + " has invited " + targetUser.name + " to join the guild.", leagueid);
			leaguePM(Server.nameColor(user.name, true) + " has invited " + Server.nameColor(targetUser.name, true) + " to join the guild.", leagueid);
			let message = "/html has invited you to join the league " + Chat.escapeHTML(leagues[leagueid].name) + ". <br />" +
				"<button name=\"send\" value=\"/guild accept " + leagueid + "\">Click to accept</button> | <button name=\"send\" value=\"/guild decline " + leagueid +
				"\">Click to decline</button>";
			targetUser.send("|pm|" + user.getIdentity() + "|" + targetUser.getIdentity() + "|" + message);
			this.sendReply("You've invited " + targetUser.name + " to join " + leagues[leagueid].name + ".");
		},

		accept: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild accept [league]");
			let leagueid = toId(target);
			if (!leagues[leagueid]) return this.errorReply("That guild does not exist.");
			if (!leagues[leagueid].pendingInvites.includes(user.userid)) return this.errorReply("You don't have a pending invitation to this guild.");

			if (getLeague(user.userid)) return this.errorReply("You've already joined a guild.");

			let sortedRanks = Object.keys(leagues[leagueid].ranks).sort(function (a, b) { return leagues[leagueid].ranks[b].rank - leagues[leagueid].ranks[a].rank; });
			let rank = sortedRanks.pop();
			leagues[leagueid].users.push(user.userid);
			leagues[leagueid].ranks[rank].users.push(user.userid);
			leagues[leagueid].pendingInvites.splice(leagues[leagueid].pendingInvites.indexOf(user.userid), 1);
			save();
			leagueLog(user.name + " has accepted their invitation to join the guild.", leagueid);
			leaguePM(Server.nameColor(user.name, true) + " has accepted their invitation to join the guild.", leagueid);

			user.popup("You've accepted the invitation to join " + leagues[leagueid].name + ".");
		},

		decline: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild decline [league]");
			let leagueid = toId(target);
			if (!leagues[leagueid]) return this.errorReply("That guild does not exist.");
			if (!leagues[leagueid].pendingInvites.includes(user.userid)) return this.errorReply("You don't have a pending invitation to this guild.");

			leagues[leagueid].pendingInvites.splice(leagues[leagueid].pendingInvites.indexOf(user.userid), 1);
			save();
			leagueLog(user.name + " has declined their invitation to join the guild.", leagueid);
			leaguePM(Server.ameColor(user.name, true) + " has declined their invitation to join the guild.", leagueid);
			user.popup("You've declined the invitation to join " + leagues[leagueid].name + ".");
		},

		kick: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild kick [user] - Kicks a user to your guild.");

			let leagueName = getLeague(user.userid);
			let leagueid = toId(leagueName);
			let targetid = toId(target);
			if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
			if (!leagues[leagueid].users.includes(targetid)) return this.errorReply("That user is not in your guild.");

			if (!hasPermission(user.userid, 'kick')) return this.errorReply("You don't have permission to kick users from '" + leagueName + "'.");

			for (let rank in leagues[leagueid].ranks) {
				if (leagues[leagueid].ranks[rank].users.includes(targetid)) {
					leagues[leagueid].ranks[rank].users.splice(leagues[leagueid].ranks[rank].users.indexOf(targetid), 1);
				}
			}
			leagues[leagueid].users.splice(leagues[leagueid].users.indexOf(targetid), 1);
			save();
			leagueLog(user.name + " has kicked " + target + " from the guild.", leagueid);
			leaguePM(Server.nameColor(user.name, true) + " has kicked " + Server.nameColor(target, true) + " from the guild.", leagueid);

			if (Users(target) && Users(target).connected) Users(target).send("|popup||html|" + Server.nameColor(user.name, true) + " has kicked you from the guild " + Chat.escapeHTML(leagues[leagueid].name) + ".");
			this.sendReply("You've kicked " + target + " from " + leagues[leagueid].name + ".");
		},

		leave: function (target, room, user) {
			let leagueid = toId(getLeague(user.userid));
			if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
			if (leagues[leagueid].ranks['owner'].users.includes(user.userid)) return this.errorReply("You can't guild a guild if you're the owner.");

			for (let rank in leagues[leagueid].ranks) {
				if (!leagues[leagueid].ranks[rank].users.includes(user.userid)) continue;
				leagues[leagueid].ranks[rank].users.splice(leagues[leagueid].ranks[rank].users.indexOf(user.userid), 1);
			}
			leagues[leagueid].users.splice(leagues[leagueid].users.indexOf(user.userid), 1);
			save();
			leagueLog(user.name + " has left the guild.", leagueid);
			leaguePM(Server.nameColor(user.name, true) + " has left the guild.", leagueid);
			this.sendReply("You have left " + leagues[leagueid].name + ".");
		},

		icon: function (target, room, user) {
		    if (!target) return this.errorReply("Usage: /guild icon [link] - set your guild icon.");
		    let leagueid = toId(getLeague(user.userid));
		    if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
		    if (!hasPermission(user.userid, 'icon')) return this.errorReply("You don't hve permission to set the guild icon of '" + leagues[leagueid].name + "'.");
		    leagues[leagueid].icon = target;
		    save();
		    leagueLog(user.name + " has set the guild icon.");
		    leaguePM(user.name + " has set guild icon.");
		    this.sendReply("You've changed the guild icon.");
		},

		description: 'desc',
		desc: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild desc [description] - Sets your guild description.");

			let leagueid = toId(getLeague(user.userid));
			if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
			if (target.length < 1) return this.errorReply("The guild description must be at least one character long.");
			if (target.length > 100) return this.errorReply("The guild description may not be longer than 100 characters.");

			if (!hasPermission(user.userid, 'desc')) return this.errorReply("You don't have permission to set the guild description of '" + leagues[leagueid].name + "'.");

			leagues[leagueid].desc = target;
			save();
			leagueLog(user.name + " has set the guild description to '" + target + "'.", leagueid);
			leaguePM(user.name + " has set the guild description to '" + Chat.escapeHTML(target) + "'.", leagueid);
			this.sendReply("You've changed the guild description.");
		},

		announce: 'pm',
		pm: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild pm [message] - Sends a message to all guild members currently online.");

			let leagueid = toId(getLeague(user.userid));
			if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
			if (target.length < 1) return this.errorReply("The nessage must be at least one character long.");
			if (target.length > 500) return this.errorReply("The message may not be longer than 500 characters.");

			if (!hasPermission(user.userid, 'masspm')) return this.errorReply("You don't have permission to send a guild pm.");

			leagueLog(user.name + " has sent out a guild pm: " + target, leagueid);
			leaguePM("Guild announcement from " + Server.nameColor(user.name, true) + ":<br />" + Chat.escapeHTML(target), leagueid);
		},

		members: function (target, room, user) {
			if (!target) return this.errorReply("Please specify a guild to view the members of.");
			target = toId(target);
			if (!leagues[target]) return this.errorReply("That guild does not exist.");
			let output = Chat.escapeHTML(leagues[target].name) + " members:\n\n";
			let sortedRanks = Object.keys(leagues[target].ranks).sort(function (a, b) { return leagues[target].ranks[b].sortBy - leagues[target].ranks[a].sortBy; });

			for (let rank in sortedRanks) {
				let users = [];
				let curRank = sortedRanks[rank];
				output += Chat.escapeHTML(leagues[target].ranks[curRank].title) + " (" + leagues[target].ranks[curRank].users.length + "):\n";
				for (let u in leagues[target].ranks[curRank].users) {
					let curUser = leagues[target].ranks[curRank].users[u];
					users.push(Server.nameColor(curUser, (Users(curUser) && Users(curUser).connected)));
				}
				output += users.join(',');
				output += "\n\n";
			}
			user.send("|popup||wide||html|" + output);
		},

		ladder: 'list',
		list: function (target, room, user) {
		    if (!this.runBroadcast()) return;
			if (Object.keys(leagues).length < 1) return this.sendReply("There's no registered guild on this server.");
			let output = '<center><table style="border-collapse: collapse ; box-shadow: 0px 0px 2px #232423" width="100%"><tr><td class="gangth" style="box-shadow: 0px 0px 1px white inset">Guild</td><td class="gangth" style="box-shadow: 0px 0px 1px white inset">Description</td><td class="gangth" style="box-shadow: 0px 0px 1px white inset">Points</td><td class="gangth" style="box-shadow: 0px 0px 1px white inset">Members</td></tr>';
			let sortedLeagues = Object.keys(leagues).sort(function (a, b) {
				return leagues[b].points - leagues[a].points;
			});

			for (let league in sortedLeagues) {
				let curLeague = leagues[sortedLeagues[league]];
				let desc = Chat.escapeHTML(curLeague.desc);
				if (desc.length > 50) desc = desc.substr(0, 50) + "<br />" + desc.substr(50);
				output += '<tr>';
				output += '<td class="gangtd" style="box-shadow: 0px 0px 10px white inset"><img src="' + curLeague.icon + '" width="33px" height="33px"> ' + Chat.escapeHTML(curLeague.name) + '</td>';
				output += '<td class="gangtd" style="box-shadow: 0px 0px 1px white inset">' + Autolinker.link(desc.replace(/&#x2f;/g, '/'), {stripPrefix: false, phone: false, twitter: false}) + '</td>';
				output += '<td class="gangtd" style="box-shadow: 0px 0px 10px white inset">' + '<button name="send" class="gangbtn" value="/guild points log ' + curLeague.id + '">' + curLeague.points + '</button></td>';
				output += '<td class="gangtd" style="box-shadow: 0px 0px 10px white inset">' + '<button name="send" class="gangbtn" value="/guild members ' + curLeague.id + '">' + curLeague.users.length + '</button></td>';
				output += '</tr>';
			}
			output += '</table></center>';
			this.sendReply("|html|" + output);
		},

		ranks: 'rank',
		rank: {
			set: 'give',
			give: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild rank give [user], [rank] - Gives a user a rank in your guild.");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				if (!targets[0]) return this.errorReply("Please specify a user to give a rank.");
				if (!targets[1]) return this.errorReply("Please specify a rank to give the user.");

				let leagueid = toId(getLeague(user.userid));
				let targetUser = Users.getExact(targets[0]);
				let rank = targets[1];

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!targetUser || !targetUser.connected) return this.errorReply("That user is not online.");
				if (!leagues[leagueid].users.includes(targetUser.userid)) return this.errorReply("That user is not in your guild.");
				if (!leagues[leagueid].ranks[toId(rank)]) return this.errorReply("That rank does not exist.");
				if (leagues[leagueid].ranks[toId(rank)].users.includes(targetUser.userid)) return this.errorReply("That user already has that rank.");

				if (!hasPermission(user.userid, 'promote')) return this.errorReply("You don't have permission to change users rank.");

				if (toId(rank) !== 'grandmaster') {
					for (let rank in leagues[leagueid].ranks) {
						if (rank === 'grandmaster') continue;
						if (leagues[leagueid].ranks[rank].users.includes(targetUser.userid)) {
							leagues[leagueid].ranks[rank].users.splice(leagues[leagueid].ranks[rank].users.indexOf(targetUser.userid), 1);
						}
					}
				}

				leagues[leagueid].ranks[toId(rank)].users.push(targetUser.userid);
				save();
				rank = leagues[leagueid].ranks[toId(rank)].title;
				leagueLog(user.name + " has set " + targetUser.name + "'s rank to " + rank, leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has set " + Server.nameColor(targetUser.name, true) + "'s rank to " + Chat.escapeHTML(rank), leagueid);
				targetUser.send("|popup||html|" + Server.nameColor(user.name, true) + " has set your guild rank in " + Chat.escapeHTML(leagues[leagueid].name) + " to " +
				Chat.escapeHTML(rank) + ".");
				this.sendReply("You've set " + targetUser.name + "'s guild rank to " + rank + ".");
			},

			take: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild rank take [user], [rank] - Takes a users rank in your guild.");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				if (!targets[0]) return this.errorReply("Please specify a user to remove a rank.");
				if (!targets[1]) return this.errorReply("Please specify a rank to remove from the user.");

				let leagueid = toId(getLeague(user.userid));
				let targetUser = targets[0];
				let rank = targets[1];

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!toId(targetUser) || toId(targetUser).length > 19) return this.errorReply("That's not a valid username.");
				if (!leagues[leagueid].users.includes(toId(targetUser))) return this.errorReply("That user is not in your guild.");
				if (!leagues[leagueid].ranks[toId(rank)]) return this.errorReply("That rank does not exist.");
				if (!leagues[leagueid].ranks[toId(rank)].users.includes(targetUser)) return this.errorReply("That user does not have that rank.");
				if (toId(rank) === 'grandmaster' && toId(targetUser) === user.userid) return this.errorReply("You can't remove owner from yourself. Give another user owner and have them remove it if you're transfering ownership of the guild.");

				if (!hasPermission(user.userid, 'promote')) return this.errorReply("You don't have permission to change users rank.");

				let hasOtherRanks;
				for (let r in leagues[leagueid].ranks) {
					if (r === toId(rank)) continue;
					if (leagues[leagueid].ranks[r].users.includes(targetUser)) {
						hasOtherRanks = true;
					}
				}
				if (!hasOtherRanks) return this.errorReply("That user has no other guild rank. Use '/guild kick " + targetUser + "' if you want to kick them from the guild.");
				leagues[leagueid].ranks[toId(rank)].users.splice(leagues[leagueid].ranks[toId(rank)].users.indexOf(toId(targetUser)), 1);
				save();
				leagueLog(user.name + " has removed the rank " + rank + " from " + targetUser, leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has removed the rank " + Chat.escapeHTML(rank) + " from " + Server.nameColor(targetUser, true), leagueid);
				if (Users(targetUser) && Users(targetUser).connected) {
					Users(targetUser).send("|popup||html|" + Server.nameColor(user.name, true) + " has removed you from the guild rank " + Chat.escapeHTML(rank) + " in " +
					Chat.escapeHTML(leagues[leagueid].name) + ".");
				}
				this.sendReply("You've removed " + targetUser + " from the guild rank " + rank + ".");
			},

			create: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild rank create [rank title], [sortby (a number)], [permissions seperated by comma] - See '/guild rank permissions' to learn valid permissions.");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let leagueid = toId(getLeague(user.userid));
				let rank = targets[0];
				let sortBy = Number(targets[1]);
				let permissions = targets.splice(2);

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (toId(rank).length < 1) return this.errorReply("Rank must be at least one character long.");
				if (rank.length > 30) return this.errorReply("Rank may not be longer than 30 characters.");
				if (leagues[leagueid].ranks[toId(rank)]) return this.errorReply("That rank already exists.");

				if (!sortBy) return this.errorReply("Please specify a number to determine where the rank appears on member list.");
				if (isNaN(sortBy)) return this.errorReply("sortby must be a number between 0 and 100. (higher sorts higher on the member list.)");

				for (let u in permissions) {
					if (!permissionList[permissions[u]]) {
						this.errorReply("The permission '" + permissions[u] + "' is not valid.");
						return this.parse("/guild rank permissions");
					}
				}

				if (!hasPermission(user.userid, 'manageranks')) return this.errorReply("You don't have permission to create guild ranks.");

				let permissionsObj = {};
				for (let u in permissions) permissionsObj[permissions[u]] = true;

				leagues[leagueid].ranks[toId(rank)] = {
					title: rank,
					users: [],
					permissions: permissionsObj,
					sortBy: sortBy,
				};
				save();
				leagueLog(user.name + " has added the rank '" + rank + "'.", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has added the rank '" + Chat.escapeHTML(rank) + "'.", leagueid);
				this.sendReply("You've added the rank '" + rank + "'.");
			},

			sortby: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild rank sortby [rank], [number] - Edits the order this rank sorts in.");
				let leagueId = toId(getLeague(user.userid));
				if (!leagueId) return this.errorReply("You're not in a guild.");
				if (!hasPermission(user.userid, 'manageranks')) return this.errorReply("You don't have permission to edit guild ranks.");

				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let rank = toId(targets[0]);
				let number = Number(targets[1]);

				if (isNaN(number) || number < 0 || number > 100) return this.errorReply("Please specify a valid number between 0 and 100");
				if (!leagues[leagueId].ranks[rank]) return this.errorReply("That rank does not exist.");

				leagues[leagueId].ranks[rank].sortBy = number;
				save();
				this.sendReply("You've edited the rank '" + rank + "'.");
			},

			delete: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild rank delete [rank title]");

				let leagueid = toId(getLeague(user.userid));
				let rank = target;

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!leagues[leagueid].ranks[toId(rank)]) return this.errorReply("That rank does not exist.");
				if (leagues[leagueid].ranks[toId(rank)].users.length > 0) return this.errorReply("You can't delete a rank that still has users.");
				if (toId(rank) === 'grandmaster') return this.errorReply("The guild has to have an owner.");

				if (!hasPermission(user.userid, 'manageranks')) return this.errorReply("You don't have permission to delete guild ranks.");

				delete leagues[leagueid].ranks[toId(rank)];
				save();
				leagueLog(user.name + " has deleted the rank '" + rank + "'.", leagueid);
				leagueLog(Server.nameColor(user.name, true) + " has deleted the rank '" + Chat.escapeHTML(rank) + "'.", leagueid);
				this.sendReply("You've deleted the rank '" + rank + "'.");
			},

			permissions: function (target, room, user) {
				if (!this.runBroadcast()) return;
				this.sendReply('|raw|<div class="infobox infobox-limited">' +
					'Valid Permissions:<br />' +
					'"all": Gives the rank access to EVERY guild command.<br />' +
					'"invite": Gives the rank access to invite users to join the guild.<br />' +
					'"kick": Gives the rank access to kick members from the guild.<br />' +
					'"desc": Gives the rank access to set the guild description.<br />' +
					'"masspm": Gives the rank access to mass pm all guild members.<br />' +
					'"promote": Gives the rank access to promote guild members.<br />' +
					'"manageranks": Gives the rank access to create and delete ranks. NOTE: This is a dangerous permission.<br />' +
					/*'"editbadges": Gives the rank access to add, edit, and remove guild badges.<br />' +
					'"givebadge": Gives the rank access to give users guild badges.<br />' +*/
					'"gvg": Gives the rank access to all Guild vs Guild commands.<br />' +
					'Example Usage: /guild rank create Professor, 3, givebadges - Creates a rank named "Professor", places it above Gym Leader, and gives it access to give badges.' +
					'</div>'
				);
			},

			'': 'help',
			help: function (target, room, user) {
				if (!this.runBroadcast()) return;
				this.sendReply("|raw|<div class=\"infobox infobox-limited\">" +
					"/guild rank create [rank title], [sortby (a number)], [permissions seperated by comma] - See <button style=\"background: none; border: none; color: blue\" name=\"send\" value=\"/guild rank permissions\"><u>/guild rank permissions</u></button> for a list of valid permissions.<br />" +
					"/guild rank delete [rank title] - Deletes a league rank. You have to remove the rank from members before deleting it.<br />" +
					"/guild rank sortby [rank], [number] - Changes how a rank sorts on the member list. 99 as a number for example would sort one below owner, 98 sorting below the rank with 99 and so on.<br />" +
					"/guild rank give [user], [rank] - Gives a rank to a user in your guild.<br />" +
					"/guild rank take [user], [rank] - Takes a rank from a user in your guild.<br />"
				);
			},
		},

		registerteam: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild registerteam [guild], [pastebin of team]");
			let splitTarget = target.split(',');
			for (let u in splitTarget) splitTarget[u] = splitTarget[u].trim();

			let league = splitTarget[0];
			let pastebin = splitTarget[1];

			if (!league) return this.errorReply("Please specify a guild to register a team with.");
			if (!leagues[toId(league)]) return this.errorReply("That guild does not exist.");
			if (leagues[toId(league)].users.includes(user.userid)) return this.errorReply("You can't challenge your own guild.");
			if (!pastebin) return this.errorReply("Please specify a pastebin containing the team you want to register.");

			if (!leagues[toId(league)].challengers) leagues[toId(league)].challengers = {};
			if (leagues[toId(league)].challengers[user.userid]) return this.errorReply("You've already registered a team with this guild.");

			getTeam(pastebin, (err, team) => {
				if (err) return this.errorReply(err);
				leagues[toId(league)].challengers[user.userid] = team;
				leaguePM(Server.nameColor(user.name, true) + " has registered their team to become a challenger.", toId(league));
				this.sendReply("Your team has been registered. You may now challenge league members with the '/guild challenge' command.");
				save();
			});
		},

		resetteam: function (target, room, user) {
			if (!target) return this.errorReply("Usage: /guild resetteam [user]");

			let league = getLeague(user.userid);

			if (!league) return this.errorReply("You're not a member of a guild.");
			if (!target) return this.errorReply("Please specify a user to reset their team.");
			let leagueid = toId(league);

			let can;
			for (let rank in leagues[leagueid].ranks) {
				if (leagues[leagueid].ranks[rank].users.length < 1) continue;
				if (leagues[leagueid].ranks[rank].users.includes(user.userid) && leagues[leagueid].ranks[rank].rank >= 4) can = true;
			}
			if (!can) return this.errorReply("You don't have permission to reset a users team.");

			if (!leagues[leagueid].challengers) leagues[leagueid].challengers = {};
			if (!leagues[leagueid].challengers || !leagues[leagueid].challengers[toId(target)]) return this.errorReply("That user hasn't registered a team.");

			leagueLog(user.name + " has reset " + target + "'s registered team.", leagueid);

			delete leagues[leagueid].challengers[toId(target)];
			save();
		},

		challenge: function (target, room, user, connection) {
			if (!target) return this.errorReply("Usage: /guild challenge [guild], [user to challenge]");
			let splitTarget = target.split(',');
			for (let u in splitTarget) splitTarget[u] = splitTarget[u].trim();

			let league = splitTarget[0];
			let targetUser = Users(splitTarget[1]);

			if (!league) return this.errorReply("Please specify a guild to challenge.");
			if (!leagues[toId(league)]) return this.errorReply("That guild does not exist.");
			if (!targetUser || !targetUser.connected) return this.errorReply("That user is not online.");
			if (leagues[toId(league)].users.includes(user.userid)) return this.errorReply("You can't challenge your own guild.");
			if (!leagues[toId(league)].users.includes(targetUser.userid)) return this.errorReply("That user is not a member of that guild.");

			if (!leagues[toId(league)].challengers || !leagues[toId(league)].challengers[user.userid]) return this.errorReply("You need to register a team to challenge this guild first. Use /guild registerteam [guild], [pastebin of your team]");

			if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
				return this.popupReply("The user '" + this.targetUsername + "' is not accepting challenges right now.");
			}
			if (user.challengeTo) {
				return this.popupReply("You're already challenging '" + user.challengeTo.to + "'. Cancel that challenge before challenging someone else.");
			}
			user.team = leagues[toId(league)].challengers[user.userid];
			user.prepBattle(Dex.getFormat('ubers').id, 'challenge', connection).then(result => {
				if (result) {
					user.makeChallenge(targetUser, 'monotype');
					targetUser.send('|pm|' + user.getIdentity() + '|~|/raw <div class="infobox">' + Server.nameColor(user.name, true) + ' is challenging your guild.</div>');
					user.send('|pm|' + targetUser.getIdentity() + '|~|/raw <div class="infobox">You are challenging ' + Server.nameColor(targetUser.userid, true) + '\'s guild.');
					leaguePM(Server.nameColor(user.name, true) + " has challenged " + Server.nameColor(targetUser.name, true) + ".");
				}
			});
		},

		/*badge: 'badges',
		badges: {
			add: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge add [badge name], [badge image], [badge description]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let leagueid = toId(getLeague(user.userid));
				let badgeName = targets[0];
				let badgeImage = targets[1];
				let badgeDesc = targets.slice(2);

				if (!badgeName) return this.errorReply("Please specify a badge name.");
				if (!badgeImage) return this.errorReply("Please specify a badge image.");
				if (!badgeDesc) return this.errorReply("Please specify a badge description.");

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (toId(badgeName).toString().length < 1) return this.errorReply("Badge names must be at least one character long.");
				if (toId(badgeName).toString().length > 30) return this.errorReply("Badge names may not be longer than 30 characters.");
				if (toId(badgeImage).toString().length < 1) return this.errorReply("Invalid badge image.");
				if (badgeImage.toString().length > 200) return this.errorReply("That image url is too long.");
				if (badgeDesc.toString().length < 1) return this.errorReply("Badge descriptions must be at least one character long.");
				if (badgeDesc.toString().length > 100) return this.errorReply("Badge descriptions may not be longer than 100 characters.");
				if (leagues[leagueid].badges[toId(badgeName)]) return this.errorReply("That badge already exists.");

				if (!hasPermission(user.userid, 'editbadges')) return this.errorReply("You don't have permission to create guild badges.");

				leagues[leagueid].badges[toId(badgeName)] = {
					'title': badgeName,
					'image': badgeImage,
					'desc': badgeDesc,
					'users': [],
				};
				save();
				leagueLog(user.name + " has added the badge '" + badgeName + "'.", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has added the badge '" + Chat.escapeHTML(badgeName) + "'.", leagueid);
				this.sendReply("Your badge has been added.");
			},

			edit: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge edit [badge name], [badge image], [badge description]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let leagueid = toId(getLeague(user.userid));
				let badgeName = targets[0];
				let badgeImage = targets[1];
				let badgeDesc = targets.slice(2);

				if (!badgeName) return this.errorReply("Please specify a badge name.");
				if (!badgeImage) return this.errorReply("Please specify a badge image.");
				if (!badgeDesc) return this.errorReply("Please specify a badge description.");

				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (toId(badgeName).toString().length < 1) return this.errorReply("Badge names must be at least one character long.");
				if (toId(badgeName).toString().length > 30) return this.errorReply("Badge names may not be longer than 30 characters.");
				if (toId(badgeImage).toString().length < 1) return this.errorReply("Invalid badge image.");
				if (badgeImage.toString().length > 200) return this.errorReply("That image url is too long.");
				if (badgeDesc.toString().length < 1) return this.errorReply("Badge descriptions must be at least one character long.");
				if (badgeDesc.toString().length > 100) return this.errorReply("Badge descriptions may not be longer than 100 characters.");
				if (!leagues[leagueid].badges[toId(badgeName)]) return this.errorReply("That badge doesn't exist.");

				if (!hasPermission(user.userid, 'editbadges')) return this.errorReply("You don't have permission to edit guild badges.");

				leagues[leagueid].badges[toId(badgeName)].title = badgeName;
				leagues[leagueid].badges[toId(badgeName)].image = badgeImage;
				leagues[leagueid].badges[toId(badgeName)].desc = badgeDesc;
				save();
				leagueLog(user.name + " has edited the badge '" + badgeName + "'.", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has edited the badge '" + Chat.escapeHTML(badgeName) + "'.", leagueid);
				this.sendReply("That badge has been edited.");
			},

			delete: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge delete [badge name]");

				let leagueid = toId(getLeague(user.userid));
				let badgeName = target;

				if (!badgeName) return this.errorReply("Please specify a badge to delete.");
				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!leagues[leagueid].badges[toId(badgeName)]) return this.errorReply("That badge doesn't exist.");

				if (!hasPermission(user.userid, 'editbadges')) return this.errorReply("You don't have permission to delete guild badges.");

				delete leagues[leagueid].badges[toId(badgeName)];
				save();
				leagueLog(user.name + " has deleted the badge '" + badgeName + "'.", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has deleted the badge '" + Chat.escapeHTML(badgeName) + "'.", leagueid);
				this.sendReply("Your badge has been deleted.");
			},

			give: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge give [badge name], [user]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let leagueid = toId(getLeague(user.userid));
				let badgeName = targets[0];
				let targetUser = targets[1];

				if (!badgeName) return this.errorReply("Please specify a badge to give.");
				if (!targetUser) return this.errorReply("Please specify a user to give a badge.");
				if (toId(targetUser).length > 19) return this.errorReply("That's not a valid username.");
				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!leagues[leagueid].badges[toId(badgeName)]) return this.errorReply("That badge doesn't exist.");
				if (leagues[leagueid].badges[toId(badgeName)].users.includes(toId(targetUser))) return this.errorReply("That user already has that badge.");

				if (!hasPermission(user.userid, 'givebadge')) return this.errorReply("You don't have permission to give guild badges.");

				leagues[leagueid].badges[toId(badgeName)].users.push(toId(targetUser));
				save();
				leagueLog(user.name + " has given the badge '" + badgeName + "' to " + targetUser + ".", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has given the badge '" + Chat.escapeHTML(badgeName) + "' to " + Server.nameColor(targetUser, true) + ".", leagueid);
				if (Users(targetUser) && Users(targetUser).connected) {
					Users(targetUser).send("|popup||html|" + Server.nameColor(user.name, true) + " has given you the rguild badge " + Chat.escapeHTML(badgeName) + " in " + Chat.escapeHTML(leagues[leagueid].name) + ".");
				}
				this.sendReply("You've given " + targetUser + " the badge " + badgeName + ".");
			},

			take: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge take [badge name], [user]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				let leagueid = toId(getLeague(user.userid));
				let badgeName = targets[0];
				let targetUser = targets[1];

				if (!badgeName) return this.errorReply("Please specify a badge to take.");
				if (!targetUser) return this.errorReply("Please specify a user to take a badge from.");
				if (toId(targetUser).length > 19) return this.errorReply("That's not a valid username.");
				if (!leagues[leagueid]) return this.errorReply("You're not in a guild.");
				if (!leagues[leagueid].badges[toId(badgeName)]) return this.errorReply("That badge doesn't exist.");
				if (!leagues[leagueid].badges[toId(badgeName)].users.includes(toId(targetUser))) return this.errorReply("That user doesn't have that badge.");

				if (!hasPermission(user.userid, 'givebadge')) return this.errorReply("You don't have permission to take guild badges.");

				leagues[leagueid].badges[toId(badgeName)].users.splice(leagues[leagueid].badges[toId(badgeName)].users.indexOf(toId(targetUser)), 1);
				save();
				leagueLog(user.name + " has taken the badge '" + badgeName + "' from " + targetUser + ".", leagueid);
				leaguePM(Server.nameColor(user.name, true) + " has taken the badge '" + Chat.escapeHTML(badgeName) + "' from " + Server.nameColor(targetUser, true) + ".", leagueid);
				if (Users(targetUser) && Users(targetUser).connected) {
					Users(targetUser).send("|popup||html|" + Server.nameColor(user.name, true) + " has taken the rguild badge " + Chat.escapeHTML(badgeName) + " from you in " + Chat.escapeHTML(leagues[leagueid].name) + ".");
				}
				this.sendReply("You've taken the badge " + badgeName + " from " + targetUser + ".");
			},

			list: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badges list [league]");
				let leagueid = toId(target);
				if (!leagues[leagueid]) return this.errorReply("That guild doesn't exist.");
				if (!this.runBroadcast()) return;
				if (Object.keys(leagues[leagueid].badges).length < 1) return this.sendReplyBox("That guild has no badges.");
				let output = '<table border="1" cellspacing ="0" cellpadding="3"><tr><td>Badge</td><td>Description</td><td>Image</td></tr>';
				for (let badge in leagues[leagueid].badges) {
					let curBadge = leagues[leagueid].badges[badge];
					output += "<tr>";
					output += "<td>" + Chat.escapeHTML(curBadge.title) + "</td>";
					output += "<td>" + Chat.escapeHTML(curBadge.desc) + "</td>";
					output += '<td><img src="' + curBadge.image + '" width="16" height="16"></td>';
					output += "</tr>";
				}
				this.sendReplyBox(output);
			},

			view: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild badge view [user]");
				if (toId(target).length > 19) return this.errorReply("That name is too long.");
				if (!this.runBroadcast()) return;
				let badges = Server.getBadges(target);
				if (badges.length < 1) return this.sendReplyBox(Server.nameColor(target, true) + " has no guild badges.");
				let output = Server.nameColor(target, true) + "'s guild badges:<br /><br />";
				for (let u in badges) {
					output += Chat.escapeHTML(u) + ":<br />";
					for (let i in badges[u]) {
						output += '<img src="' + badges[u][i].img + '" title="' + Chat.escapeHTML(badges[u][i].name) + '" width="16" height="16">';
					}
					output += "<br />";
				}
				return this.sendReplyBox(output);
			},

			'': 'help',
			help: function (target, room, user) {
				if (!this.runBroadcast()) return;
				this.sendReply("|raw|<div class=\"infobox infobox-limited\">" +
					"Guild Badge Commands:<br />" +
					"/guild badge add [badge name], [badge image], [badge description] - Adds a guild badge.<br />" +
					"/guild badge edit [badge name], [badge image], [badge description] - Edits an existing badge without removing it.<br />" +
					"/guild badge delete [badge name] - Deletes a badge.<br />" +
					"/guild badge give [badge name], [user] - Gives a badge to a user.<br />" +
					"/guild badge take [badge name], [user] - Takes a badge from a user.<br />" +
					"/guild badge list [guild] - List the badges of a guild." +
					"</div>"
				);
			},
		},*/

		gvg: {
			accept: function (target, room, user) {
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");

				if (!hasPermission(user.userid, 'lvl')) return this.errorReply("You don't have permission to accept Guild vs Guild.");

				let leagueId = toId(getLeague(user.userid));

				if (!Rooms.global.LvL[leagueId] || !Rooms.global.LvL[leagueId].challenger) return this.errorReply("Your guild doesn't have any pending challenges.");

				let targetLeagueid = Rooms.global.LvL[leagueId].challenger;

				let targetRoom = Rooms(Rooms.global.LvL[leagueId].room);
				targetRoom.lvl.accepted = true;
				lvlDisplay(targetRoom);

				leaguePM(Server.nameColor(user.name, true) + ' has accepted the Guild vs Guild challenge against ' + Chat.escapeHTML(leagues[targetLeagueid].name), leagueId);
				leaguePM(Server.nameColor(user.name, true) + ' (' + leagues[leagueId].name + ') has accepted the Guild vs Guild challenge against your Guild.', targetLeagueid);

				this.sendReply("You've accepted the Guild vs Guild against " + leagues[targetLeagueid].name + ".");
			},

			deny: function (target, room, user) {
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");

				if (!hasPermission(user.userid, 'lvl')) return this.errorReply("You don't have permission to deny Guild vs Guild.");

				let leagueId = toId(getLeague(user.userid));

				if (!Rooms.global.LvL[leagueId] || !Rooms.global.LvL[leagueId].challenger) return this.errorReply("Your guild doesn't have any pending challenges.");

				let targetLeagueid = Rooms.global.LvL[leagueId].challenger;

				let targetRoom = Rooms(Rooms.global.LvL[leagueId].room);
				targetRoom.add('|uhtmlchange|gvg-' + targetRoom.lvl.lvlId + '|');
				targetRoom.add('|uhtml|gvg-' + targetRoom.lvl.lvlId + '|' +
					'<div class="infobox">(' + Chat.escapeHTML(leagues[leagueId].name) + ' has declined the Guild vs Guild challenge.)</div>'
				);

				leaguePM(Server.nameColor(user.name, true) + ' has declined the Guild vs Guild challenge against ' + Chat.escapeHTML(leagues[targetLeagueid].name), leagueId);
				leaguePM(Server.nameColor(user.name, true) + ' (' + leagues[leagueId].name + ') has declined the Guild vs Guild challenge against your guild.', targetLeagueid);

				delete Rooms.global.LvL[targetLeagueid];
				delete Rooms.global.LvL[leagueId];
				delete targetRoom.lvl;
				this.sendReply("You've declined the Guild vs Guild against " + leagues[targetLeagueid].name + ".");
			},

			end: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild gvg end [room]");
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");

				if (!hasPermission(user.userid, 'lvl')) return this.errorReply("You don't have permission to end Guild vsGuild.");

				let targetRoom = Rooms(toId(target));
				if (!targetRoom) return this.errorReply("That room does not exist.");
				if (!targetRoom.lvl) return this.errorReply("There's no Guild vs Guild in that room.");

				let leagueId = toId(getLeague(user.userid));
				if (targetRoom.lvl.leagues[0].id !== leagueId && targetRoom.lvl.leagues[1].id !== leagueId) return this.errorReply("Your guild is not apart of this Guild vs Guild.");

				let targetLeagueid = room.lvl.leagues[0].id;
				if (targetRoom.lvl.leagues[1].id !== leagueId) targetLeagueid = targetRoom.lvl.leagues[1].id;

				targetRoom.add('|uhtmlchange|rvs-' + targetRoom.lvl.lvlId + '|');
				targetRoom.add('|uhtml|rvs-' + targetRoom.lvl.lvlId + '|(The Guild vs Guild has been forcibly ended by ' + Chat.escapeHTML(user.name) + ' (' + Chat.escapeHTML(leagues[leagueId].name) + '))');

				leaguePM(Server.nameColor(user.name, true) + ' has forcibly ended the Guild vs Guild with ' + Chat.escapeHTML(leagues[targetLeagueid].name) + '.', leagueId);

				delete Rooms.global.LvL[targetLeagueid];
				delete Rooms.global.LvL[leagueId];
				delete targetRoom.lvl;
			},

			invite: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild gvg invite [user] - Invites a guild member to the join a Guild vs Guild.");
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");
				if (!hasPermission(user.userid, 'lvl')) return this.errorReply("You don't have permission to invite users to join a Guild vs Guild.");

				let leagueId = toId(getLeague(user.userid));
				let targetUser = Users(target);
				let targetUserLeague = getLeague(target);

				if (!Rooms.global.LvL[leagueId]) return this.errorReply("Your guild is not in a Guild vs Guild.");
				if (!targetUser || !targetUser.connected) return this.errorReply("That user is not online.");
				let targetRoom = Rooms(Rooms.global.LvL[leagueId].room);
				let league = targetRoom.lvl.leagues[0];
				let targetLeague = targetRoom.lvl.leagues[1];
				if (targetRoom.lvl.leagues[1].id === leagueId) {
					league = targetRoom.lvl.leagues[1];
					targetLeague = targetRoom.lvl.leagues[0];
				}
				if (!targetUserLeague || toId(targetUserLeague) !== leagueId);
				if (league.players.includes(targetUser.userid)) return this.errorReply("That user has already joined this Guild vs Guild.");
				if (league.invites.includes(targetUser.userid)) return this.errorReply("That user has already been invited to join the Guild vs Guild.");

				league.invites.push(targetUser.userid);
				leaguePM(Server.nameColor(user.name, true) + " has invited " + Server.nameColor(targetUser.name, true) + " to join the Guild vs Guild against " + Chat.escapeHTML(leagues[targetLeague.id].name), leagueId);
				targetUser.send("|popup||modal||html|" + Server.nameColor(user.name, true) + " has invited you to join the Guild vs Guild against " + Chat.escapeHTML(leagues[targetLeague.id].name) +
					" in the room <button name=\"joinRoom\" value=\"" + targetRoom.id + "\">" + Chat.escapeHTML(targetRoom.title) + "</button>");
				this.sendReply("You've invited " + targetUser.name + " to join the guild vs guild");
			},

			join: function (target, room, user) {
				if (!room.lvl) return this.errorReply("There's no Guild vs Guild in this room.");
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");
				if (!room.lvl.accepted) return this.errorReply("This Guild vs Guild hasn't been accepted yet.");

				let leagueId = toId(getLeague(user.userid));
				if (room.lvl.leagues[0].id !== leagueId && room.lvl.leagues[1].id !== leagueId) return this.errorReply("Your guild is not apart of this Guild vs Guild");

				let league = room.lvl.leagues[0];

				if (room.lvl.leagues[1].id === leagueId) league = room.lvl.leagues[1];

				if (!league.invites.includes(user.userid)) return this.errorReply("You haven't been invited to join this Guild vs Guild.");
				if (league.players.length >= room.lvl.size) return this.errorReply("Your guilds team is already full.");
				if (league.players.includes(user.userid)) return this.errorReply("You've already joined this Guild vs Guild.");

				league.players.push(user.userid);
				room.add(user.name + " has joined the Guild vs Guild for " + getLeague(user.userid));
				lvlDisplay(room);
			},

			leave: function (target, room, user) {
				if (!room.lvl) return this.errorReply("There's no Guild vs Guild in this room.");
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");
				if (!room.lvl.accepted) return this.errorReply("This Guild vs Guild hasn't been accepted yet.");

				let leagueId = toId(getLeague(user.userid));
				if (room.lvl.leagues[0].id !== leagueId && room.lvl.leagues[0].id !== leagueId) return this.errorReply("Your guild is not apart of this Guild vs Guild.");

				let league = room.lvl.leagues[0];

				if (room.lvl.leagues[1].id === leagueId) league = room.lvl.leagues[1];
				if (!league.players.includes(user.userid)) return this.errorReply("You haven't joined this Guild vs Guild.");
				if (room.lvl.started) return this.errorReply("You can't leave a Guild vs Guild after it starts.");

				league.players.splice(league.players.indexOf(user.userid), 1);
				room.add(user.name + " has left the Guild vs Guild.");
				lvlDisplay(room);
			},

			challenge: function (target, room, user) {
				if (!target) return this.errorReply("Usage: /guild gvg challenge [guild], [mode], [size]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();

				if (!targets[1]) return this.errorReply("Usage: /guild gvg challenge [guild], [mode], [size]");
				if (!getLeague(user.userid)) return this.errorReply("You're not in a guild.");

				let targetLeagueid = toId(targets[0]);
				let leagueId = toId(getLeague(user.userid));
				if (leagueId === targetLeagueid) return this.errorReply("You can't challenge your own guild.");
				let mode = "normal";
				let size = Number((targets[2] ? targets[2] : 3));
				if (targets[1]) mode = toId(targets[1]);

				if (!leagues[targetLeagueid]) return this.errorReply("That guild does not exist.");
				if (mode !== "normal" && mode !== "quick") return this.errorReply("That's not a valid mode. Valid modes: normal, quick.");
				if (isNaN(size) || size < 3 || size > 15) return this.errorReply("Please specify a size of at least 3 and no larger than 15");
				if (!isOdd(size)) return this.errorReply("Size must be an odd number.");
				if (Rooms.global.LvL[leagueId] && Rooms.global.LvL[leagueId].challenging) return this.errorReply("You're already challenging " + leagues[Rooms.global.LvL[leagueId].challenging].name + ".");
				if (Rooms.global.LvL[leagueId] && Rooms.global.LvL[leagueId].challenger) return this.errorReply("Your guild is being challenged by " + leagues[Rooms.global.LvL[leagueId].challenger].name + ". Please accept or deny it before challenging a guild.");
				if (room.lvl) return this.errorReply("There's currently a Guild vs Guild running in this room.");
				if (!hasPermission(user.userid, 'lvl')) return this.errorReply("You don't have permission to start a Guild vs Guild.");
				if (!user.can('broadcast', null, room)) return this.errorReply("You don't have permission to start a Guild vs Guild in that room.");

				let lvlId = Server.randomString(10);

				Rooms.global.LvL[leagueId] = {
					challenging: targetLeagueid,
					room: room.id,
				};
				Rooms.global.LvL[targetLeagueid] = {
					challenger: leagueId,
					room: room.id,
				};

				room.lvl = {
					lvlId: lvlId,
					leagues: [
						{
							id: leagueId,
							name: leagues[leagueId].name,
							players: [],
							invites: [],
							wins: 0,
						},
						{
							id: targetLeagueid,
							name: leagues[targetLeagueid].name,
							players: [],
							invites: [],
							wins: 0,
							pending: true,
						},
					],
					size: size,
					started: false,
					status: [],
					types: {},
					statusNumber: 0,
					accepted: false,
					mode: mode,
				};

				for (let i = 0; i < size; i++) room.lvl.status.push((mode === "normal" ? 3 : 2));

				leaguePM(
					Server.nameColor(user.name, true) + ' (' + Chat.escapeHTML(getLeague(user.userid)) + ') has challenged your guild to a Guild vs Guild (' +
					size + 'v' + size + ') in' +
					' <button name="joinRoom" value="' + room.id + '">' + Chat.escapeHTML(room.title) + '</button>.<br />' +
					'<button name="send" value="/guild gvg accept">Accept</button> | <button name="send" value="/guild rvs deny">Decline</button>', targetLeagueid
				);
				leaguePM(
					Server.nameColor(user.name, true) + ' has challenged ' + Chat.escapeHTML(leagues[targetLeagueid].name) + ' to a Guild vs Guild (' +
					size + 'v' + size + ') in <button name="joinRoom" value="' + room.id + '">' + Chat.escapeHTML(room.title) + '</button>'
				);
				room.add('|uhtml|lvl-' + lvlId + '|' +
					'<div class="infobox"><center>' + Server.nameColor(user.name, true) + ' has challenged ' + Chat.escapeHTML(leagues[targetLeagueid].name) +
					' to a Guild vs Guild. (' + size + 'v' + size + ')<br />Waiting for a response...</center></div>'
				);
			},

			'': 'help',
			help: function (target, room, user) {
				if (!this.runBroadcast()) return;
				this.sendReply("|raw|<div class=\"infobox infobox-limited\">" +
					"Guild vs Guild Commands:<br />" +
					"/gvg challenge [league], [mode (normal or quick)], [size (must be odd number)] - Challenges a guild to a Guild vs Guild in the current room.<br />" +
					"(Quick mode lets players battle each other at the same time, normal mode limits it to one battle at a time.)<br />" +
					"/gvg accept - Accepts a challenge from a guild.<br />" +
					"/gvg deny - Denies a challenge from a guild.<br />" +
					"/gvg invite [user] - Invites a guild member to join the Guild vs Guild.<br />" +
					"/rvs join - Joins a Guild vs Guild. Must be invited with /gvg invite first.<br />" +
					"/gvg leave - Leaves a Guild vs Guild after you join. May not be used once the Guild vs Guild starts.<br />" +
					"/gvg end - Forcibly ends a Guild vs Guild." +
					"</div>"
				);
			},
		},

		'point': 'points',
		points: {
			give: function (target, room, user) {
				if (!this.can('eval')) return false;
				if (!target) return this.errorReply("Usage: /guild points give [guild], [points]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();
				if (!targets[1]) return this.errorReply("Usage: /guild points give [guild], [points]");

				let league = toId(targets[0]);
				let amount = Math.round(Number(targets[1]));

				if (!leagues[league]) return this.errorReply("That guild does not exist.");
				if (isNaN(amount) || amount < 1 || amount > 500) return this.errorReply("Amount must be a valid number between 1 and 500.");

				leagues[league].points += amount;
				save();
				logPointsUser("ADMIN", league, amount, "Points given by " + user.name);
				this.sendReply("You've given " + leagues[league].name + " " + amount + (amount === 1 ? " point." : " points."));
				leaguePM(Server.nameColor(user.name, true) + " has given your guild " + amount + (amount === 1 ? " point." : " points."), league);
			},

			take: function (target, room, user) {
				if (!this.can('eval')) return false;
				if (!target) return this.errorReply("Usage: /guild points take [guild], [points]");
				let targets = target.split(',');
				for (let u in targets) targets[u] = targets[u].trim();
				if (!targets[1]) return this.errorReply("Usage: /guild points take [guild], [points]");

				let league = toId(targets[0]);
				let amount = Math.round(Number(targets[1]));

				if (!leagues[league]) return this.errorReply("That guild does not exist.");
				if (isNaN(amount) || amount < 1 || amount > 500) return this.errorReply("Amount must be a valid number between 1 and 500.");

				leagues[league].points -= amount;
				save();
				logPointsUser("ADMIN", league, -amount, "Points taken by " + user.name);
				this.sendReply("You've taken " + amount + (amount === 1 ? " point " : " points ") + " from " + leagues[league].name + ".");
				leaguePM(Server.nameColor(user.name, true) + " has taken " + amount + (amount === 1 ? " point " : " points ") + " from your guild.", league);
			},

			reset: function (target, room, user) {
				if (!this.can('eval')) return false;
				if (!user.confirmLeaguePointsReset) {
					this.errorReply("WARNING: THIS WILL RESET ALL guild POINTS");
					this.errorReply("Run this command again if you are sure this is what you want to do.");
					user.confirmLeaguePointsReset = true;
					return;
				}

				this.logModCommand(user.name + " has reset all guild points.");
				Server.messageSeniorStaff("/html " + Server.nameColor(user.name, true) + " has reset all guild points.");
				Rooms('staff').add("|raw|" + Server.nameColor(user.name, true) + " has reset all guild points.").update();
				delete user.confirmLeaguePointsReset;
				for (let u in leagues) leagues[u].points = 0;
				save();
				database.run("DELETE FROM points;");
			},

			userlog: 'log',
			log: function (target, room, user, connection, cmd) {
				let leagueid = '';
				let targetUser = '';
				let searchObj;
				if (cmd === 'log') {
					leagueid = (target ? toId(target) : toId(getLeague(user.userid)));
					if (!leagueid && !target) return this.errorReply("Please specify a guild to view the points log.");
					if (!leagues[leagueid]) return this.errorReply("That guild does not exist.");
					searchObj = {$leagueid: leagueid};
				} else {
					if (!target) return this.errorReply("Please specify a user to view the logs of.");
					targetUser = toId(target);
					if (targetUser.length < 1 || targetUser.length > 19) return this.errorReply("That's not a valid user to search for.");
					leagueid = toId(getLeague(targetUser));
					if (!leagueid) return this.errorReply("That user isn't in a guild.");
					searchObj = {$userid: targetUser};
				}

				database.all("SELECT * FROM points WHERE " + (cmd === 'userlog' ? "userid=$userid " : "league=$leagueid ") + "ORDER BY date DESC LIMIT 500", searchObj, (err, rows) => {
					if (err) return console.log("/guild points log: " + err);
					if (rows.length < 1) return user.popup("No guild point logs found for " + Chat.escapeHTML(leagues[leagueid].name));

					let output = '<center>Displaying last 500 entries in guild points log for ' + Chat.escapeHTML(leagues[leagueid].name) + '<br /><br />';
					output += '<table border="1" cellspacing="0" cellpadding="5"><tr><th>User</th><th>Date</th><th>Reason</th><th>Points</th></tr>';

					for (let u in rows) {
						output += '<tr>';
						output += '<td>' + Server.nameColor(rows[u].userid, (Users(rows[u].userid) && Users(rows[u].userid).connected)) + '</td>';
						output += '<td>' + new Date(rows[u].date).toUTCString() + '</td>';
						output += '<td>' + Chat.escapeHTML(rows[u].reason) + '</td>';
						output += '<td>' + rows[u].points + '</td>';
						output += '</tr>';
					}

					output += '</table></center>';
					user.popup('|wide||html|' + output);
				});
			},

			'': 'help',
			help: function (target, room, user) {
				if (!this.runBroadcast()) return;
				this.sendReply("|raw|<div class=\"infobox infobox-limited\">" +
					"Guild Points Commands:<br />" +
					"/guild points give [guild], [amount] - Gives a guild points.<br />" +
					"/guild points take [guild], [amount] - Takes points from a guild.<br />" +
					"/guild points log [guild] - Displays the last 500 entries in the points log for a guild.<br />" +
					"/guild points userlog [user] - Displays the last 500 points a user has earned.<br />" +
					"/guild points reset - Resets every guild points back to 0." +
					"</div>"
				);
			},
		},

		'': 'help',
		help: function (target, room, user) {
			if (!this.runBroadcast()) return;
			return this.sendReply(
				"|raw|<div class=\"infobox\">" +
				"Managed Guild System:<br />" +
				"Admin Commands:<br />" +
				"/guild create [guild name], [guild owner] - Creates a guild.<br />" +
				"/guild delete [guild name] - Deletes a guild.<br /><br />" +
				"Guild Commands:<br />" +
				"/guild invite [user] - Invites a user to join a guild.<br />" +
				"/guild kick [user] - Kicks a user from a guild.<br />" +
				"/guild desc [description] - Sets a description for your guild, visible on /guild list.<br />" +
				"/guild pm [message] - Mass PM's a message to all online guild members<br />" +
				"/guild accept [guild name] - Accepts an invitation to join a guild.<br />" +
				"/guild decline [guild name] - Declines an invitation to join a guild.<br />" +
				"/guild leave - Leaves your current guild.<br />" +
				"/guild list - Displays a list of guild.<br />" +
				"/guild members [guild name] - Displays the memberlist for a guild.<br /><br />" +
				"Guild Challenging:<br />" +
				"/guild registerteam [guild name], [pastebin of team] - Registers your team so you can challenge the guild.<br />" +
				"/guild challenge [guild name], [user] - Challenges a user with the team you registered.<br />" +
				"/guild resetteam [user] - Resets a users registered team so they can register again. Requires permission level 4 or higher. (Default: Champions)<br /><br />" +
				"guild Rank Commands:<br />" +
				"/guild rank give [user], [rank] - Gives a user a rank.<br />" +
				"/guild rank take [user], [rank] - Removes a rank from a user.<br />" +
				"/guild rank create [rank name], [sortby (a number for sorting this rank on /guild [members], [permissions seperated by comma] - Creates a new guild rank. See '/guild rank permissions' to learn about valid permissions.<br />" +
				"/guild rank delete [rank name] - Deletes a guild rank. Note: you can't delete a rank if any users currently have the rank.<br /><br />" +
				/*"Guild Badge Commands: <br />" +
				"/guild badge give [badge name], [user] - Gives a user a guild badge.<br />" +
				"/guild badge take [badge name], [user] - Takes a guild badge from a user.<br />" +
				"/guild badge add [badge name], [badge image], [badge description] - Creates a guild badge.<br />" +
				"/guild badge edit [badge name], [badge image], [badge description] - Edits a guild badge.<br />" +
				"/guild badge delete [badge name] - Deletes a guild badge.<br />" +
				"/guild badge list [guild name] - Lists a guilds badges.<br />" +
				"/guild badge view [user] - Views a users guild badges<br /><br />" +*/
				"Guild vs Guild Commands:<br />" +
				"/gvg challenge [guild], [mode (normal or quick)], [size (must be odd number)] - Challenges a guild to a Guild vs Guild in the current room.<br />" +
				"(Quick mode lets players battle each other at the same time, normal mode limits it to one battle at a time.)<br />" +
				"/gvg accept - Accepts a challenge from a guild.<br />" +
				"/gvg deny - Denies a challenge from a guild..<br />" +
				"/gvg invite [user] - Invites a guild member to join the Guild vs Guild.<br />" +
				"/gvg join - Joins a Guild vs Guild. Must be invited with /gvg invite first.<br />" +
				"/gvg leave - Leaves a Guild vs Guild after you join. May not be used once the Guild vs Guild starts.<br />" +
				"/gvg end - Forcibly ends a Guild vs Guild.<br /><br />" +
				"Guild Points:<br />" +
				"/guild points give [guild], [amount] - Gives a guild points.<br />" +
				"/guild points take [guild], [amount] - Takes points from a guild.<br />" +
				"/guild points log [guild] - Displays the last 500 entries in the points log for a guild.<br />" +
				"/guild points userlog [user] - Displays the last 500 points a user has earned." +
				"</div>"
			);
		},
	},
	lvl: function (target, room, user) {
		return this.parse('/guild lvl ' + target);
	},
	leaguehelp: function (target, room, user) {
		return this.parse('/guild help');
	},
};
