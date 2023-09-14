// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from "alt1";
import * as BuffReader from 'alt1/buffs';
import * as TargetMob from 'alt1/targetmob';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import "./index.html";
import "./appconfig.json";
import "./icon.png";
import "./css/jobgauge.css";
import TargetMobReader from "alt1/targetmob";


var output = document.getElementById("output");
var settings = document.getElementById('Settings');
var settingsButton = document.getElementById('SettingsButton');
var offhand = <HTMLInputElement> document.getElementById('Offhand');
var forcedConjures = <HTMLInputElement> document.getElementById('ForcedConjures');
var jobGauge = document.getElementById("JobGauge");
var conjures = document.getElementById('Conjures');
var skeleton_conjure = document.getElementById('Skeleton');
var zombie_conjure = document.getElementById('Zombie');
var ghost_conjure = document.getElementById('Ghost');
var souls = document.getElementById('Souls');
var bloat = document.getElementById('Bloat');
var necrosis = document.getElementById("Necrosis");

// loads all images as raw pixel data async, images have to be saved as *.data.png
// this also takes care of metadata headers in the image that make browser load the image
// with slightly wrong colors
// this function is async, so you cant acccess the images instantly but generally takes <20ms
// use `await imgs.promise` if you want to use the images as soon as they are loaded
var imgs = a1lib.webpackImages({
	necrosis: require('./asset/data/Necrosis.data.png'),
	necrosis_2: require('./asset/data/Necrosis-2.data.png'),
	necrosis_4: require('./asset/data/Necrosis-4.data.png'),
	necrosis_6: require('./asset/data/Necrosis-6.data.png'),
	necrosis_8: require('./asset/data/Necrosis-8.data.png'),
	necrosis_10: require('./asset/data/Necrosis-10.data.png'),
	necrosis_12: require('./asset/data/Necrosis-12.data.png'),
	residual_soul: require('./asset/data/Residual_Soul.data.png'),
	residual_soul_top: require('./asset/data/Residual_Soul-Top.data.png'),
	residual_soul_1: require('./asset/data/Residual_Soul_1.data.png'),
	residual_soul_2: require('./asset/data/Residual_Soul_2.data.png'),
	residual_soul_3: require('./asset/data/Residual_Soul_3.data.png'),
	residual_soul_4: require('./asset/data/Residual_Soul_4.data.png'),
	residual_soul_5: require('./asset/data/Residual_Soul_5.data.png'),
	skeleton_warrior: require('./asset/data/Skeleton_Warrior.data.png'),
	skeleton_warrior_T12: require('./asset/data/Skeleton_Warrior-T12.data.png'),
	skeleton_warrior_T12_17: require('./asset/data/Skeleton_Warrior-T12-17.data.png'),
	skeleton_warrior_top: require('./asset/data/Skeleton_Warrior-Top.data.png'),
	skeleton_warrior_right: require('./asset/data/Skeleton_Warrior-Right.data.png'),
	putrid_zombie: require('./asset/data/Putrid_Zombie.data.png'),
	putrid_zombie_T12: require('./asset/data/Putrid_Zombie-T12.data.png'),
	putrid_zombie_top: require('./asset/data/Putrid_Zombie-Top.data.png'),
	vengeful_ghost: require('./asset/data/Vengeful_Ghost.data.png'),
	vengeful_ghost_T12: require('./asset/data/Vengeful_Ghost-T12.data.png'),
	vengeful_ghost_top: require('./asset/data/Vengeful_Ghost-Top.data.png'),
	vengeful_ghost_right: require('./asset/data/Vengeful_Ghost-Right.data.png'),
	bloated: require('./asset/data/Bloated.data.png'),
});

export function startJobGauge() {
	if (!window.alt1) {
		output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		output.insertAdjacentHTML(
			'beforeend',
			`<div>Page is not installed as app or capture permission is not enabled</div>`
		);
		return;
	}
	var img = a1lib.captureHoldFullRs();
	setInterval(() => { findNecrosis() }, 200);
	setInterval(() => { getSoulsValue(); }, 200);
	setInterval(() => {
		getConjures();
	}, 200);
	setInterval(function() { checkBloat(img) }, 200);
}

function initSettings() {
	if (!localStorage.nyusNecroJobGauge) {
		localStorage.setItem(
			'nyusNecroJobGauge',
			JSON.stringify({
				buffsLocation: getBuffsLocation,
				offhand95: false,
				forcedConjures: true
			})
		);
	} else {
		loadSettings();
	}
}

function loadSettings() {
	if (Boolean(getSetting('offhand95'))) {
		offhand.checked = true;
		souls.dataset.offhand = '95';
	} else {
		offhand.checked = false;
		souls.dataset.offhand = '90';
	}

	if (Boolean(getSetting('forcedConjures'))) {
		forcedConjures.checked = true;
	} else {
		forcedConjures.checked = false;
	}
}


offhand.addEventListener('click', () => {
	updateSetting('offhand95', offhand.checked);
	loadSettings();
});

forcedConjures.addEventListener('click', () => {
	updateSetting('forcedConjures', forcedConjures.checked);
	loadSettings();
});

function getSetting(setting) {
	if (!localStorage.nyusNecroJobGauge) {
		initSettings();
	}
	return JSON.parse(localStorage.getItem('nyusNecroJobGauge'))[setting];
}

function updateSetting(setting, value) {
    if (!localStorage.getItem("nyusNecroJobGauge")) {
        localStorage.setItem("nyusNecroJobGauge", JSON.stringify({}));
    }
    var save_data = JSON.parse(localStorage.getItem("nyusNecroJobGauge"));
    save_data[setting] = value;
    localStorage.setItem("nyusNecroJobGauge", JSON.stringify(save_data));
}

function getBuffsLocation() {
	var buffs = new BuffReader.default();
	if (buffs.find()) {
		return buffs.getCaptRect();
	} else {
		getBuffsLocation();
	}
}

function checkBloat(img) {
	var targetDisplay = new TargetMob.default;
	targetDisplay.read();
	if (targetDisplay.lastpos === null) {
		return;
	}

	var target_display_loc = {
		x: targetDisplay?.lastpos.x - 120,
		y: targetDisplay?.lastpos.y + 20,
		w: 150,
		h: 60,
	};
	var targetDebuffs = a1lib.captureHold(
		target_display_loc.x,
		target_display_loc.y,
		target_display_loc.w,
		target_display_loc.h
	);
	var targetIsBloated = targetDebuffs.findSubimage(imgs.bloated).length;
	var bloatTimer = parseFloat(parseFloat(bloat.dataset.timer).toFixed(2));
	if (targetIsBloated && bloatTimer == 0) {
		bloat.dataset.timer = '18';
		for (let i = 0; i < 30; i++) {
			setTimeout(() => {
				if (!targetIsBloated) {
					bloat.style.setProperty('--timer', (0.0).toString());
					bloat.dataset.timer = (0.0).toString();
				} else {
					let currentTick = roundedToFixed(
						bloat.dataset.timer,
						1
					);
					let nextTick = roundedToFixed(
						parseFloat(currentTick) - 0.6,
						1
					);
					if (parseInt(nextTick, 10) > 0) {
						bloat.style.setProperty('--timer', nextTick);
						bloat.dataset.timer = nextTick;
					}
				}
			}, 600 * i);
		}
	} else if (!targetIsBloated) {
		bloat.style.setProperty('--timer', (0.0).toString());
		bloat.dataset.timer = (0.0).toString();
	}

}

function roundedToFixed(input, digits) {
	var rounder = Math.pow(10, digits);
	return (Math.round(input * rounder) / rounder).toFixed(digits);
}

a1lib.on('rsfocus' , startJobGauge);
settingsButton.addEventListener('click' , toggleSettings);

function toggleSettings() {
	settings.classList.toggle('visible');
}

function findNecrosis() {
	var buffsLocation = getBuffsLocation();
	var searchArea = a1lib.captureHold(buffsLocation.x, buffsLocation.y, buffsLocation.width, buffsLocation.height);
	var isNecrosis = searchArea.findSubimage(imgs.necrosis).length;
	if (isNecrosis) {
		getNecrosisStacks();
	 }
	 else {
		necrosis.dataset.stacks = '0';
	 }
}

function getNecrosisStacks() {
	var buffsLocation = getBuffsLocation();
	var searchArea = a1lib.captureHold(
		buffsLocation.x,
		buffsLocation.y,
		buffsLocation.width,
		buffsLocation.height
	);
	var isNecrosis2 = searchArea.findSubimage(imgs.necrosis_2).length;
	var isNecrosis4 = searchArea.findSubimage(imgs.necrosis_4).length;
	var isNecrosis6 = searchArea.findSubimage(imgs.necrosis_6).length;
	var isNecrosis8 = searchArea.findSubimage(imgs.necrosis_8).length;
	var isNecrosis10 = searchArea.findSubimage(imgs.necrosis_10).length;
	var isNecrosis12 = searchArea.findSubimage(imgs.necrosis_12).length;
	var necrosisStacks = [
		isNecrosis2,
		isNecrosis4,
		isNecrosis6,
		isNecrosis8,
		isNecrosis10,
		isNecrosis12,
	];
	var necrosisStackValue = (necrosisStacks.indexOf(1) + 1) * 2;
	necrosis.dataset.stacks = necrosisStackValue.toString();
}

function getSoulsValue() {
	var buffsLocation = getBuffsLocation();
	var searchArea = a1lib.captureHold(
		buffsLocation.x,
		buffsLocation.y,
		buffsLocation.width,
		buffsLocation.height
	);
	var isSouls1 = searchArea.findSubimage(imgs.residual_soul_1).length;
	var isSouls2 = searchArea.findSubimage(imgs.residual_soul_2).length;
	var isSouls3 = searchArea.findSubimage(imgs.residual_soul_3).length;
	var isSouls4 = searchArea.findSubimage(imgs.residual_soul_4).length;
	var isSouls5 = searchArea.findSubimage(imgs.residual_soul_5).length;
	var residualSouls = [isSouls1, isSouls2, isSouls3, isSouls4, isSouls5];
	var residualSoulsValue = parseInt(residualSouls.indexOf(1).toString(), 10) + 1;
	souls.dataset.souls = residualSoulsValue.toString();
}

function getConjures() {
	var buffsLocation = getBuffsLocation();
	var searchArea = a1lib.captureHold(
		buffsLocation.x,
		buffsLocation.y,
		buffsLocation.width,
		buffsLocation.height
	);
	var conjuredSkeleton =
		(searchArea.findSubimage(imgs.skeleton_warrior_top).length ||
		searchArea.findSubimage(imgs.skeleton_warrior_right).length);
	var conjuredZombie= searchArea.findSubimage(imgs.putrid_zombie_top).length;
	var conjuredGhost =
		searchArea.findSubimage(imgs.vengeful_ghost_top).length ||
		searchArea.findSubimage(imgs.vengeful_ghost_right).length;
	var conjuredConjures = [conjuredSkeleton, conjuredZombie, conjuredGhost];
	if (conjuredConjures[0] == 1) {
		skeleton_conjure.classList.remove('inactive');
	} else if (conjuredConjures[0] == 0 ) {
		skeleton_conjure.classList.add('inactive');
	}
	if (conjuredConjures[1] == 1) {
		zombie_conjure.classList.remove('inactive');
	} else if (conjuredConjures[1] == 0) {
		zombie_conjure.classList.add('inactive');
	}
	if (conjuredConjures[2] == 1) {
		ghost_conjure.classList.remove('inactive');
	} else if (conjuredConjures[2] == 0) {
		ghost_conjure.classList.add('inactive');
	}
	if (forcedConjures.checked) {
		check12s(searchArea);
	}
}

var foundSkeleton12 = false;
var foundZombie12 = false;
var foundGhost12 = false;

function check12s(searchArea) {
	var conjuredSkeletonT12 =
		searchArea.findSubimage(imgs.skeleton_warrior_T12).length ||
		searchArea.findSubimage(imgs.skeleton_warrior_T12_17).length;
	if (conjuredSkeletonT12) {
		if (foundSkeleton12 === false) {
			foundSkeleton12 = true;
			setTimeout(function () {
				finalCountdown(skeleton_conjure);
			}, 1000);
		}
		setTimeout(() => {
			skeleton_conjure.classList.remove('forced-active');
			skeleton_conjure.classList.add('inactive');
			skeleton_conjure.dataset.remaining = '11';
			foundSkeleton12 = false;
		}, 12000);
	}
	var conjuredZombieT12 = searchArea.findSubimage(
		imgs.putrid_zombie_T12
	).length;
	if (conjuredZombieT12) {
		zombie_conjure.classList.add('forced-active');
		if (foundZombie12 === false) {
			foundZombie12 = true;
			setTimeout(function () {
				finalCountdown(zombie_conjure);
			}, 1000);
		}
		setTimeout(() => {
			zombie_conjure.classList.remove('forced-active');
			zombie_conjure.classList.add('inactive');
			zombie_conjure.dataset.remaining = '11';
			foundZombie12 = false;
		}, 12000);
	}
	var conjuredGhostT12 = searchArea.findSubimage(
		imgs.vengeful_ghost_T12
	).length;
	if (conjuredGhostT12) {
		if (foundGhost12 === false) {
			foundGhost12 = true;
			setTimeout(function() {
				finalCountdown(ghost_conjure)
			},1000);
		}
		setTimeout(() => {
			ghost_conjure.classList.remove('forced-active');
			ghost_conjure.classList.add('inactive');
			ghost_conjure.dataset.remaining = '11';
			foundGhost12 = false;
		}, 12000);
	}
}

function finalCountdown(conjure: HTMLElement) {
		conjure.classList.add('forced-active');
		for (let i = 0; i < 12; i++) {
			setTimeout(() => {
				if (parseInt(conjure.dataset.remaining) > 0) {
					let newValue = parseInt(conjure.dataset.remaining) - 1;
					conjure.dataset.remaining = newValue.toString();
				}
			}, 1000 * i);
		}
}

//check if we are running inside alt1 by checking if the alt1 global exists
if (window.alt1) {
	//tell alt1 about the app
	//this makes alt1 show the add app button when running inside the embedded browser
	//also updates app settings if they are changed
	alt1.identifyAppUrl("./appconfig.json");
	initSettings();
	startJobGauge();
} else {
	let addappurl = `alt1://addapp/${new URL("./appconfig.json", document.location.href).href}`;
	output.insertAdjacentHTML("beforeend", `
		Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
	`);
}
