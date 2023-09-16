// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as BuffReader from 'alt1/buffs';
import * as TargetMob from 'alt1/targetmob';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/jobgauge.css';

var buffs = new BuffReader.default();

var output = document.getElementById('output');
var settings = document.getElementById('Settings');
var settingsButton = document.getElementById('SettingsButton');
var jobGauge = document.getElementById('JobGauge');
var conjures = document.getElementById('Conjures');
var skeleton_conjure = document.getElementById('Skeleton');
var zombie_conjure = document.getElementById('Zombie');
var ghost_conjure = document.getElementById('Ghost');
var souls = document.getElementById('Souls');
var bloat = document.getElementById('Bloat');
var necrosis = document.getElementById('Necrosis');
var livingDeath = document.getElementById('LivingDeath');

// loads all images as raw pixel data async, images have to be saved as *.data.png
// this also takes care of metadata headers in the image that make browser load the image
// with slightly wrong colors
// this function is async, so you cant acccess the images instantly but generally takes <20ms
// use `await imgs.promise` if you want to use the images as soon as they are loaded
var buffImages = a1lib.webpackImages({
	livingDeath: require('./asset/data/Living_Death.data.png'),
	necrosis: require('./asset/data/Necrosis.data.png'),
	residual_soul: require('./asset/data/Residual_Soul.data.png'),

	skeleton_warrior: require('./asset/data/Skeleton_Warrior.data.png'),
	putrid_zombie: require('./asset/data/Putrid_Zombie.data.png'),
	vengeful_ghost: require('./asset/data/Vengeful_Ghost.data.png'),

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
	setInterval(() => {
		getNecrosisStacks();
	}, 150);
	setInterval(() => {
		getSoulsValue();
	}, 150);
	setInterval(() => {
		getLivingDeathTime();
	}, 150);
	setInterval(() => {
		getConjures();
	}, 200);
	setInterval(function () {
		checkBloat();
	}, 200);
}

function initSettings() {
	if (!localStorage.nyusNecroJobGauge) {
		setDefaultSettings();
		loadSettings();
	} else {
		loadSettings();
	}
}

function setDefaultSettings() {
		localStorage.setItem(
			'nyusNecroJobGauge',
			JSON.stringify({
				buffsLocation: getBuffsLocation,
				offhand95: false,
				forcedConjures: true,
				ghostSettings: false,
				singleNecrosis: false,
				jobGaugeScale: 100,
				conjureScale: 100,
				soulScale: 100,
				bloatScale: 100,
				necrosisScale: 100,
				soulBgColor: '#52f9fa',
				necrosisDefaultBgColor: '#9205e4',
				necrosisFreecastBgColor: '#fd7d00',
				necrosisCappedBgColor: '#ff0000',
				bloatNotchColor: '#ff0000',
				activeConjureTimers: true,
				gappedNecrosis: false,
				livingDeathPlacement: false,
				conjuresTracker: true,
				soulsTracker: true,
				bloatTracker: true,
				necrosisTracker: true,
				livingdDeathTracker: true,
			})
		);
}

function loadSettings() {
	setTrackedComponents();
	setOffhand();
	setConjureTimers();
	setForcedConjures();
	setGhostSettingsButton();
	setSingleNecrosis();
	setNecrosisGap();
	setLivingDeathPlacement();
	setCustomColors();
	setCustomScale();
}

function setTrackedComponents() {
	conjuresTracker.checked = Boolean(getSetting('conjuresTracker'));
	conjures.classList.toggle('tracked', !Boolean(getSetting('conjuresTracker')));

	soulsTracker.checked = Boolean(getSetting('soulsTracker'));
	souls.classList.toggle('tracked', !Boolean(getSetting('soulsTracker')));

	bloatTracker.checked = Boolean(getSetting('bloatTracker'));
	bloat.classList.toggle('tracked', !Boolean(getSetting('bloatTracker')));

	necrosisTracker.checked = Boolean(getSetting('necrosisTracker'));
	necrosis.classList.toggle(
		'tracked',
		!Boolean(getSetting('necrosisTracker'))
	);

	livingdDeathTracker.checked = Boolean(getSetting('livingdDeathTracker'));
	livingDeath.classList.toggle(
		'tracked',
		!Boolean(getSetting('livingdDeathTracker'))
	);
}

function setOffhand() {
	offhand.checked = Boolean(getSetting('offhand95'));
	souls.classList.toggle('t90', !Boolean(getSetting('offhand95')));
}

function setConjureTimers() {
	conjureTimers.checked = Boolean(getSetting('activeConjureTimers'));
	skeleton_conjure.classList.toggle(
		'active-timer',
		getSetting('activeConjureTimers')
	);
	zombie_conjure.classList.toggle(
		'active-timer',
		getSetting('activeConjureTimers')
	);
	ghost_conjure.classList.toggle(
		'active-timer',
		getSetting('activeConjureTimers')
	);
}

function setForcedConjures() {
	forcedConjures.checked = Boolean(getSetting('forcedConjures'));
}

function setGhostSettingsButton() {
	ghostSettings.checked = Boolean(getSetting('ghostSettings'))
	settingsButton.classList.toggle('ghost', Boolean(getSetting('ghostSettings')));
}

function setSingleNecrosis() {
	singleNecrosis.checked = Boolean(getSetting('singleNecrosis'))
	necrosis.classList.toggle('single', Boolean(getSetting('singleNecrosis')));
}

function setNecrosisGap() {
	gappedNecrosis.checked = Boolean(getSetting('gappedNecrosis'));
	necrosis.classList.toggle('gapped', Boolean(getSetting('gappedNecrosis')));
}

function setLivingDeathPlacement() {
	livingDeathPlacement.checked = Boolean(getSetting('livingDeathPlacement'));
	let livingDeath = document.getElementById('LivingDeath');

	if (livingDeathPlacement.checked) {
		livingDeath.style.setProperty('--order', '1');
	} else {
		livingDeath.style.setProperty('--order', '-1');
	}
}

function setDefaultColors() {
	let currentSoulBgColor = '#52f9fa';
	let currentNecrosisDefaultBgColor = '#9205e4';
	let currentNecrosisFreecastBgColor = '#fd7d00';
	let currentNecrosisCappedBgColor = '#ff0000';
	let currentBloatNotchColor = '#ff0000';

	document.documentElement.style.setProperty(
		'--soul-bg-color',
		currentSoulBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-default-bg-color',
		currentNecrosisDefaultBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-freecast-bg-color',
		currentNecrosisFreecastBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-capped-bg-color',
		currentNecrosisCappedBgColor
	);
	document.documentElement.style.setProperty(
		'--bloat-notch-color',
		currentBloatNotchColor
	);

	document
		.getElementById('SoulBgColor')
		.setAttribute('value', currentSoulBgColor);

	document
		.getElementById('NecrosisDefaultBgColor')
		.setAttribute('value', currentNecrosisDefaultBgColor);

	document
		.getElementById('NecrosisFreestyleBgColor')
		.setAttribute('value', currentNecrosisFreecastBgColor);

	document
		.getElementById('NecrosisCappedBgColor')
		.setAttribute('value', currentNecrosisCappedBgColor);

	document
		.getElementById('BloatNotchColor')
		.setAttribute('value', currentBloatNotchColor);

	for (let color of colorFields) {
		updateSetting(color.dataset.setting, color.value);
	}

}

let revertDefaultColorButton = document.getElementById('RevertDefaultColors');
revertDefaultColorButton.addEventListener('click', () => {
	setDefaultColors();
})

function setCustomColors() {
	let currentSoulBgColor = getSetting('soulBgColor');
	let currentNecrosisDefaultBgColor = getSetting('necrosisDefaultBgColor');
	let currentNecrosisFreecastBgColor = getSetting('necrosisFreecastBgColor');
	let currentNecrosisCappedBgColor = getSetting('necrosisCappedBgColor');
	let currentBloatNotchColor = getSetting('bloatNotchColor');

	document.documentElement.style.setProperty(
		'--soul-bg-color',
		currentSoulBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-default-bg-color',
		currentNecrosisDefaultBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-freecast-bg-color',
		currentNecrosisFreecastBgColor
	);
	document.documentElement.style.setProperty(
		'--necrosis-capped-bg-color',
		currentNecrosisCappedBgColor
	);
	document.documentElement.style.setProperty(
		'--bloat-notch-color',
		currentBloatNotchColor
	);

	document
		.getElementById('SoulBgColor')
		.setAttribute('value', currentSoulBgColor);

	document
		.getElementById('NecrosisDefaultBgColor')
		.setAttribute('value', currentNecrosisDefaultBgColor);

	document
		.getElementById('NecrosisFreestyleBgColor')
		.setAttribute('value', currentNecrosisFreecastBgColor);

	document
		.getElementById('NecrosisCappedBgColor')
		.setAttribute('value', currentNecrosisCappedBgColor);

	document
		.getElementById('BloatNotchColor')
		.setAttribute('value', currentBloatNotchColor);
}

function setCustomScale() {
	jobGauge.style.setProperty(
		'--scale',
		getSetting('jobGaugeScale')
	);
	conjures.style.setProperty('--scale', getSetting('conjureScale'));
	souls.style.setProperty('--scale', getSetting('soulScale'));
	bloat.style.setProperty('--scale', getSetting('bloatScale'));
	necrosis.style.setProperty('--scale', getSetting('necrosisScale'));

	document
		.getElementById('JobGaugeScale')
		.setAttribute('value', getSetting('jobGaugeScale'));

	document
		.getElementById('ConjuresScale')
		.setAttribute('value', getSetting('conjureScale'));

	document
		.getElementById('SoulsScale')
		.setAttribute('value', getSetting('soulScale'));

	document
		.getElementById('BloatScale')
		.setAttribute('value', getSetting('bloatScale'));

	document
		.getElementById('NecrosisScale')
		.setAttribute('value', getSetting('necrosisScale'));

	let JobGaugeScaleValue = document.querySelector('#JobGaugeScaleOutput');
	let JobGaugeScaleInput: any = document.querySelector('#JobGaugeScale');
	JobGaugeScaleValue.textContent = JobGaugeScaleInput.value;

	let ConjuresScaleValue = document.querySelector('#ConjuresScaleOutput');
	let ConjuresScaleInput: any = document.querySelector('#ConjuresScale');
	ConjuresScaleValue.textContent = ConjuresScaleInput.value;

	let SoulsScaleValue = document.querySelector('#SoulsScaleOutput');
	let SoulsScaleInput: any = document.querySelector('#SoulsScale');
	SoulsScaleValue.textContent = SoulsScaleInput.value;

	let BloatScaleValue = document.querySelector('#BloatScaleOutput');
	let BloatScaleInput: any = document.querySelector('#BloatScale');
	BloatScaleValue.textContent = BloatScaleInput.value;

	let NecrosisScaleValue = document.querySelector('#NecrosisScaleOutput');
	let NecrosisScaleInput: any = document.querySelector('#NecrosisScale');
	NecrosisScaleValue.textContent = NecrosisScaleInput.value;
}

function getSetting(setting) {
	if (!localStorage.nyusNecroJobGauge) {
		initSettings();
	}
	return JSON.parse(localStorage.getItem('nyusNecroJobGauge'))[setting];
}

function updateSetting(setting, value) {
	if (!localStorage.getItem('nyusNecroJobGauge')) {
		localStorage.setItem('nyusNecroJobGauge', JSON.stringify({}));
	}
	var save_data = JSON.parse(localStorage.getItem('nyusNecroJobGauge'));
	save_data[setting] = value;
	localStorage.setItem('nyusNecroJobGauge', JSON.stringify(save_data));
	loadSettings();
}

function getBuffsLocation() {
	if (buffs.find()) {
		return buffs.getCaptRect();
	} else {
		getBuffsLocation();
	}
}

function getActiveBuffs() {
	if (buffs.find()) {
		return buffs.read();
	} else {
		getActiveBuffs();
	}
}

function checkBloat() {
	var targetDisplay = new TargetMob.default();
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
	var targetIsBloated = targetDebuffs.findSubimage(buffImages.bloated).length;
	var bloatTimer = parseFloat(parseFloat(bloat.dataset.timer).toFixed(2));
	if (targetIsBloated && bloatTimer == 0) {
		bloat.dataset.timer = '18';
		for (let i = 0; i < 30; i++) {
			setTimeout(() => {
				if (!targetIsBloated) {
					bloat.style.setProperty('--timer', (0.0).toString());
					bloat.dataset.timer = (0.0).toString();
				} else {
					let currentTick = roundedToFixed(bloat.dataset.timer, 1);
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

a1lib.on('rsfocus', startJobGauge);

function findNecrosisCount() {
	let allBuffs = getActiveBuffs();
	let necrosisCount = 0;

	for (let [key, value] of Object.entries(allBuffs)) {
		let necrosisBuff = value.countMatch(buffImages.necrosis, false);
		if (necrosisBuff.passed > 140) {
			necrosisCount = value.readTime();
		}
	}

	return necrosisCount;
}

function getNecrosisStacks() {
	let necrosisStackValue = findNecrosisCount();
	necrosis.dataset.stacks = necrosisStackValue.toString();
}

function findLivingDeath() {
	let allBuffs = getActiveBuffs();
	let livingDeathTimer = 0;

	for (let [key, value] of Object.entries(allBuffs)) {
		let livingDeathBuff = value.countMatch(buffImages.livingDeath, false);
		if (livingDeathBuff.passed > 150) {
			livingDeath.classList.remove('cooldown');
			livingDeathTimer = value.readTime();
		}
	}

	return livingDeathTimer;
}

function getLivingDeathTime() {
	let livingDeathTimer = findLivingDeath();
	livingDeath.dataset.timer = livingDeathTimer.toString();

	if (livingDeathTimer > 10) {
		livingDeath.dataset.cast = '1';
	}

	if (livingDeathTimer == 0) {
		livingDeath.classList.add('inactive');
		if (livingDeath.dataset.cast == '1') {
			livingDeath.dataset.cast = '0';
			livingDeath.dataset.remaining = '60';
			livingDeath.classList.add('cooldown');
			startLivingDeathCooldownTimer();
		}
	} else {
		livingDeath.classList.remove('inactive');
	}
}

var startedLivingDeathCooldownTimer = false;
function startLivingDeathCooldownTimer() {
	if (!startedLivingDeathCooldownTimer) {
		startedLivingDeathCooldownTimer = true;
		finalCountdown(livingDeath, 60);
	}
	setTimeout(() => {
		livingDeath.classList.remove('cooldown');
		livingDeath.dataset.remaining = '60';
		startedLivingDeathCooldownTimer = false;
	}, 60000);
}

function findSoulCount() {
	let allBuffs = getActiveBuffs();
	let soulsCount = 0;

	for (let [key, value] of Object.entries(allBuffs)) {
		let soulsBuff = value.countMatch(
			buffImages.residual_soul,
			false
		);
		if (soulsBuff.passed > 200) {
			soulsCount = value.readTime();
		}
	}

	return soulsCount;
}

function getSoulsValue() {
	let residualSoulsValue = findSoulCount();
	souls.dataset.souls = residualSoulsValue.toString();
}

function trackConjures() {
	let allBuffs = getActiveBuffs();

	let foundSkeleton = false;
	let foundZombie = false;
	let foundGhost = false;

	for (let [key, value] of Object.entries(allBuffs)) {
		let skeletonCheck = value.countMatch(
			buffImages.skeleton_warrior,
			false
		);
		if (skeletonCheck.passed > 70) {
			foundSkeleton = true;
			skeleton_conjure.dataset.timer = value.readTime().toString();
		}

		let zombieCheck = value.countMatch(buffImages.putrid_zombie, false);
		if (zombieCheck.passed > 100) {
			foundZombie = true;
			zombie_conjure.dataset.timer = value.readTime().toString();
		}

		let ghostCheck = value.countMatch(buffImages.vengeful_ghost, false);
		if (ghostCheck.passed > 200) {
			foundGhost = true;
			ghost_conjure.dataset.timer = value.readTime().toString();
		}
	}

	return [foundSkeleton, foundZombie, foundGhost];
}

var startedSkeleton12sTimer = false;
var startedZombie12sTimer = false;
var startedGhost12sTimer = false;
function getConjures() {
	let foundConjures = trackConjures();

	skeleton_conjure.classList.toggle('active', foundConjures[0]);
	zombie_conjure.classList.toggle('active', foundConjures[1]);
	ghost_conjure.classList.toggle('active', foundConjures[2]);

	if (forcedConjures.checked) {

		let skeletonFinal12 = skeleton_conjure.dataset.timer;
		let zombieFinal12 = zombie_conjure.dataset.timer;
		let ghostFinal12 = ghost_conjure.dataset.timer

		if (skeletonFinal12 == '12') {
			skeleton_conjure.classList.add('forced-active');
			if (!startedSkeleton12sTimer) {
				startedSkeleton12sTimer = true;
				finalCountdown(skeleton_conjure, 12);
			}
			setTimeout(() => {
				skeleton_conjure.classList.remove('forced-active');
				skeleton_conjure.classList.remove('active');
				skeleton_conjure.dataset.remaining = '12';
				startedSkeleton12sTimer = false;
			}, 11000);
		}

		if (zombieFinal12 == '12') {
			zombie_conjure.classList.add('forced-active');
			if (!startedZombie12sTimer) {
				startedZombie12sTimer = true;
				finalCountdown(zombie_conjure, 12);
			}
			setTimeout(() => {
				zombie_conjure.classList.remove('forced-active');
				zombie_conjure.classList.remove('active');
				zombie_conjure.dataset.remaining = '12';
				startedZombie12sTimer = false;
			}, 11000);
		}

		if (ghostFinal12 == '12') {
			ghost_conjure.classList.add('forced-active');
			if (!startedGhost12sTimer) {
				startedGhost12sTimer = true;
				finalCountdown(ghost_conjure, 12);
			}
			setTimeout(() => {
				ghost_conjure.classList.remove('forced-active');
				ghost_conjure.classList.remove('active');
				ghost_conjure.dataset.remaining = '12';
				startedGhost12sTimer = false;
			}, 11000);
		}
	}
}

function finalCountdown(element: HTMLElement, time: number) {
	for (let i = 0; i < time; i++) {
		setTimeout(() => {
			if (parseInt(element.dataset.remaining) > 0) {
				let newValue = parseInt(element.dataset.remaining) - 1;
				element.dataset.remaining = newValue.toString();
			}
		}, 1000 * i);
	}
}

/* Settings */

function toggleSettings() {
	settings.classList.toggle('visible');
}

settingsButton.addEventListener('click', toggleSettings);

var conjuresTracker = <HTMLInputElement>(
	document.getElementById('ConjuresTracker')
);
var soulsTracker = <HTMLInputElement>document.getElementById('SoulStracker');
var bloatTracker = <HTMLInputElement>document.getElementById('BloatTracker');
var necrosisTracker = <HTMLInputElement>(
	document.getElementById('NecrosisTracker')
);
var livingdDeathTracker = <HTMLInputElement>(
	document.getElementById('LivingDeathTracker')
);

var offhand = <HTMLInputElement>document.getElementById('Offhand');
var conjureTimers = <HTMLInputElement>(
	document.getElementById('ActiveConjureTimers')
);
var forcedConjures = <HTMLInputElement>(
	document.getElementById('ForcedConjures')
);
var ghostSettings = <HTMLInputElement>document.getElementById('GhostSettings');
var gappedNecrosis = <HTMLInputElement>document.getElementById('GappedNecrosis');
var livingDeathPlacement = <HTMLInputElement>document.getElementById('LivingDeathPlacement');
var singleNecrosis = <HTMLInputElement>(
	document.getElementById('SingleRowNecrosis')
);
var colorFields: any = document.getElementsByClassName('colors');


conjuresTracker.addEventListener('click', () => {
	updateSetting('conjuresTracker', conjuresTracker.checked);
});


soulsTracker.addEventListener('click', () => {
	updateSetting('soulsTracker', soulsTracker.checked);
});


bloatTracker.addEventListener('click', () => {
	updateSetting('bloatTracker', bloatTracker.checked);
});


necrosisTracker.addEventListener('click', () => {
	updateSetting('necrosisTracker', necrosisTracker.checked);
});


livingdDeathTracker.addEventListener('click', () => {
	updateSetting('livingdDeathTracker', livingdDeathTracker.checked);
});

offhand.addEventListener('click', () => {
	updateSetting('offhand95', offhand.checked);
});

conjureTimers.addEventListener('click', () => {
	updateSetting('activeConjureTimers', conjureTimers.checked);
});

forcedConjures.addEventListener('click', () => {
	updateSetting('forcedConjures', forcedConjures.checked);
});

ghostSettings.addEventListener('click', () => {
	updateSetting('ghostSettings', ghostSettings.checked);
});

gappedNecrosis.addEventListener('click', () => {
	updateSetting('gappedNecrosis', gappedNecrosis.checked);
});

livingDeathPlacement.addEventListener('click', () => {
	updateSetting('livingDeathPlacement', livingDeathPlacement.checked);
});

singleNecrosis.addEventListener('click', () => {
	updateSetting('singleNecrosis', singleNecrosis.checked);
});

for (let color of colorFields) {
	color.addEventListener('input', (e) => {
		updateSetting(e.target.dataset.setting, e.target.value);
	});
}

var JobGaugeScaleValue = document.querySelector('#JobGaugeScaleOutput');
var JobGaugeScaleInput: any = document.querySelector('#JobGaugeScale');
JobGaugeScaleValue.textContent = JobGaugeScaleInput.value;
JobGaugeScaleInput.addEventListener('input', (event) => {
	JobGaugeScaleValue.textContent = event.target.value;
	updateSetting('jobGaugeScale', event.target.value);
});

var ConjuresScaleValue = document.querySelector('#ConjuresScaleOutput');
var ConjuresScaleInput: any = document.querySelector('#ConjuresScale');
ConjuresScaleValue.textContent = ConjuresScaleInput.value;
ConjuresScaleInput.addEventListener('input', (event) => {
	ConjuresScaleValue.textContent = event.target.value;
	updateSetting('conjureScale', event.target.value);
});


var SoulsScaleValue = document.querySelector('#SoulsScaleOutput');
var SoulsScaleInput: any = document.querySelector('#SoulsScale');
SoulsScaleValue.textContent = SoulsScaleInput.value;
SoulsScaleInput.addEventListener('input', (event) => {
	SoulsScaleValue.textContent = event.target.value;
	updateSetting('soulScale', event.target.value);
});


var BloatScaleValue = document.querySelector('#BloatScaleOutput');
var BloatScaleInput: any = document.querySelector('#BloatScale');
BloatScaleValue.textContent = BloatScaleInput.value;
BloatScaleInput.addEventListener('input', (event) => {
	BloatScaleValue.textContent = event.target.value;
	updateSetting('bloatScale', event.target.value);
});


var NecrosisScaleValue = document.querySelector('#NecrosisScaleOutput');
var NecrosisScaleInput: any = document.querySelector('#NecrosisScale');
NecrosisScaleValue.textContent = NecrosisScaleInput.value;
NecrosisScaleInput.addEventListener('input', (event) => {
	NecrosisScaleValue.textContent = event.target.value;
	updateSetting('necrosisScale', event.target.value);
});

/* End Settings */

//check if we are running inside alt1 by checking if the alt1 global exists
if (window.alt1) {
	//tell alt1 about the app
	//this makes alt1 show the add app button when running inside the embedded browser
	//also updates app settings if they are changed
	alt1.identifyAppUrl('./appconfig.json');
	initSettings();
	startJobGauge();
} else {
	let addappurl = `alt1://addapp/${
		new URL('./appconfig.json', document.location.href).href
	}`;
	output.insertAdjacentHTML(
		'beforeend',
		`
		Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
	`
	);
}
