// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as BuffReader from 'alt1/buffs';
import * as TargetMob from 'alt1/targetmob';
import * as ws from 'ws';
import html2canvas from 'html2canvas';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/jobgauge.css';
import { isTransparent } from 'html2canvas/dist/types/css/types/color';
import { connect } from 'http2';

var buffs = new BuffReader.default();
var targetDisplay = new TargetMob.default();

var output = document.getElementById('output');
var settings = document.getElementById('Settings');
var jobGauge = document.getElementById('JobGauge');
var conjures = document.getElementById('Conjures');
var skeleton_conjure = document.getElementById('Skeleton');
var zombie_conjure = document.getElementById('Zombie');
var ghost_conjure = document.getElementById('Ghost');
var souls = document.getElementById('Souls');
var bloat = document.getElementById('Bloat');
var necrosis = document.getElementById('Necrosis');
var livingDeath = document.getElementById('LivingDeath');

const alarms = {
	alarm1: './resource/alarms/alarm1.wav',
	alarm2: './resource/alarms/alarm2.wav',
	notification1: './resource/alarms/notification1.wav',
	notification2: './resource/alarms/notification2.wav',
	notification3: './resource/alarms/notification3.wav',
	bell: './resource/alarms/bell.wav',
	elevator: './resource/alarms/elevator.wav',
	nuclear: './resource/alarms/nuclear.wav',
};

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

	startLooping();
}

let overlayCanvasOutput = document.getElementById('OverlayCanvasOutput');
function captureOverlay() {
	let overlayCanvas = document.createElement('canvas');
	overlayCanvas.id = 'OverlayCanvas';
	overlayCanvas.width = 177;
	overlayCanvas.height = 114;
	html2canvas(document.querySelector('#JobGauge'), {
		allowTaint: true,
		backgroundColor: 'transparent',
		useCORS: true,
		removeContainer: false,
	})
	.then((canvas) => {
		overlayCanvasOutput.querySelector('canvas').replaceWith(canvas);
		return
	})
	.catch(() => {
		console.log('Overlay failed to capture.');
	});
}

function getOverlayData(socket: WebSocket) {
	let overlayCanvas = overlayCanvasOutput.querySelector('canvas');
	let context = overlayCanvas.getContext('2d');
	let imageData = context.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);
	imageData.toFileBytes('image/png', 1)
	.then((res) => {
		let overlayImage = res;
		socket.send(overlayImage);
	});
}

function connectToWebSocket() {
	// Create WebSocket connection.
	const socket = new WebSocket('ws://localhost:8080');
	socket.binaryType = "arraybuffer";

	// Connection opened
	socket.addEventListener('open', (event) => {
		console.log(socket.readyState.toString());
		socket.send('Hello Server!');
		captureOverlay();
		getOverlayData(socket);
	});

	// Listen for messages
	socket.addEventListener('message', (event) => {
		console.log('Message from server ', event.data);
		socket.send('Pong received - capturing new overlay.');
		captureOverlay();
		getOverlayData(socket);
	});
}

let maxAttempts = 10;
function startLooping() {
	const interval = setInterval(() => {

		let buffs = getActiveBuffs();
		if (buffs) {
			console.log(Object.entries(buffs));
			if (!getSetting('necrosisTracker')) {
				findNecrosisCount(buffs);
			}
			if (!getSetting('soulsTracker')) {
				findSoulCount(buffs);
			}
			if (!getSetting('livingDeathTracker')) {
				findLivingDeath(buffs);
			}
			if (!getSetting('conjuresTracker')) {
				findConjures(buffs);
			}
			if (!getSetting('bloatTracker')) {
				findBloat();
			}
			// If we succesfully found buffs - restart our retries
			maxAttempts = 10;
		} else {
			if (maxAttempts == 0) {
				output.insertAdjacentHTML(
					'beforeend',
					`<p>Unable to find buff bar location.\nPlease login to the game or make sure that Alt1 can detect your buffs then reload the app.\nRemember - the Buffs Bar must be set to "Small". \nTo reload, right click this interface and select Reload.</p>`
				);
				clearInterval(interval);
				return;
			}
			if (maxAttempts >- 0) {
				maxAttempts--;
			}
			console.log(`Failed to read buffs - attempting again. Attempts left: ${maxAttempts}.`);
		}
	}, 300);
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
			activeConjureTimers: true,
			activeOverlay: false,
			bloatNotchColor: '#ff0000',
			bloatScale: 100,
			bloatTracker: false,
			buffsLocation: findPlayerBuffs,
			conjureScale: 100,
			conjuresTracker: false,
			debugMode: false,
			forcedConjures: true,
			gappedNecrosis: false,
			ghostSettings: false,
			jobGaugeScale: 100,
			livingdDeathTracker: false,
			livingDeathCooldown: false,
			livingDeathPlacement: false,
			livingDeathScale: 100,
			loopCappedNecrosisAlert: false,
			loopCappedSoulsAlert: false,
			necrosisAlertAudio: alarms.notification1,
			necrosisAlertAudioVolume: 100,
			necrosisCappedBgColor: '#ff0000',
			necrosisDefaultBgColor: '#9205e4',
			necrosisFreecastBgColor: '#fd7d00',
			necrosisScale: 100,
			necrosisTracker: false,
			offhand95: false,
			playCappedNecrosisAlert: false,
			playCappedSoulsAlert: false,
			singleNecrosis: false,
			soulBgColor: '#52f9fa',
			soulsAlertAudio: alarms.notification1,
			soulsAlertAudioVolume: 100,
			soulScale: 100,
			soulsTracker: false,
		})
	);
}

function loadSettings() {
	setTrackerComponents();
	setOffhand();
	setConjureTimers();
	setForcedConjures();
	setGhostSettingsButton();
	setSingleNecrosis();
	setNecrosisGap();
	setLivingDeathCooldown();
	setLivingDeathPlacement();
	setAlerts();
	setCustomColors();
	setCustomScale();
}

function setTrackerComponents() {
	let checkboxFields: NodeListOf<HTMLInputElement> = document.querySelectorAll(
		'.tracker.setting'
	);
	checkboxFields.forEach((checkbox) => {
		checkbox.checked = Boolean(getSetting(checkbox.dataset.setting));
	});

	let trackerComponents: NodeListOf<HTMLElement> = document.querySelectorAll('.tracker.component');
	trackerComponents.forEach((component) => {
		component.classList.toggle(
			'tracked',
			!Boolean(getSetting(component.dataset.setting))
		);
	})
}

function setOffhand() {
	let offhand = <HTMLInputElement>document.getElementById('Offhand');
	setCheckboxChecked(offhand);
	souls.classList.toggle('t90', !Boolean(getSetting('offhand95')));

	let soulsCap = <HTMLInputElement>document.getElementById('SoulsCap');
	if (offhand.checked) {
		soulsCap.innerHTML = '5';
	} else {
		soulsCap.innerHTML = '3';
	}
	offhand.addEventListener('click', () => {
		if(getSetting('offhand95')) {
			soulsCap.innerHTML = '5';
		} else {
			soulsCap.innerHTML = '3';
		}
	});
}

function setConjureTimers() {
	let conjureTimers = <HTMLInputElement>(
		document.getElementById('ActiveConjureTimers')
	);
	setCheckboxChecked(conjureTimers);

	let conjures = document.querySelectorAll('#Conjures .conjure');
	conjures.forEach((conjure) => {
		conjure.classList.toggle(
			'active-timer',
			getSetting('activeConjureTimers')
		);
	})
}

function setForcedConjures() {
	let forcedConjures = <HTMLInputElement>(document.getElementById('ForcedConjures'));
	setCheckboxChecked(forcedConjures);
}

function setGhostSettingsButton() {
	let settingsButton = document.getElementById('SettingsButton');
	let ghostSettings = <HTMLInputElement>document.getElementById('GhostSettings');
	setCheckboxChecked(ghostSettings);
	settingsButton.classList.toggle(
		'ghost',
		Boolean(getSetting('ghostSettings'))
	);
}

function setCheckboxChecked(el: HTMLInputElement) {
	el.checked = Boolean(getSetting(el.dataset.setting));
}

function setSingleNecrosis() {
	let singleNecrosis = <HTMLInputElement>(
		document.getElementById('SingleRowNecrosis')
	);
	setCheckboxChecked(singleNecrosis);
	necrosis.classList.toggle('single', Boolean(getSetting('singleNecrosis')));
}

function setNecrosisGap() {
	let gappedNecrosis = <HTMLInputElement>(
		document.getElementById('GappedNecrosis')
	);
	setCheckboxChecked(gappedNecrosis);
	necrosis.classList.toggle('gapped', Boolean(getSetting('gappedNecrosis')));
}

function setLivingDeathCooldown() {
	let livingDeathCooldown = <HTMLInputElement>(
		document.getElementById('LivingDeathCooldown')
	);
	setCheckboxChecked(livingDeathCooldown);
}

function setLivingDeathPlacement() {
	let livingDeathPlacement = <HTMLInputElement>(
		document.getElementById('LivingDeathPlacement')
	);
	setCheckboxChecked(livingDeathPlacement);

	let livingDeath = document.getElementById('LivingDeath');
	if (livingDeathPlacement.checked) {
		livingDeath.style.setProperty('--order', '1');
	} else {
		livingDeath.style.setProperty('--order', '-1');
	}
}

function setAlerts() {
	let loopCappedSoulsAlert = <HTMLInputElement>(
		document.getElementById('LoopCappedSoulsAlert')
	);
	setCheckboxChecked(loopCappedSoulsAlert);
	playCappedSoulsAlert.checked = Boolean(getSetting('playCappedSoulsAlert'));
	playCappedNecrosisAlert.checked = Boolean(getSetting('playCappedNecrosisAlert'));

	let loopCappedNecrosisAlert = <HTMLInputElement>(
		document.getElementById('LoopCappedNecrosisAlert')
	);
	setCheckboxChecked(loopCappedNecrosisAlert);

	let soulsAlertAudio = <HTMLInputElement>(document.getElementById('SoulsAlertAudio'));
	soulsAlertAudio.value = getSetting('soulsAlertAudio');

	let necrosisAlertAudio = <HTMLInputElement>(document.getElementById('NecrosisAlertAudio'));
	necrosisAlertAudio.value = getSetting('necrosisAlertAudio');

	/* Volume */
	let SoulsAlertAudioVolumeOutput = document.querySelector('#SoulsAlertAudioVolumeOutput');
	let SoulsAlertAudioVolume: any = document.querySelector('#SoulsAlertAudioVolume');
	SoulsAlertAudioVolume.value = getSetting('soulsAlertAudioVolume');
	SoulsAlertAudioVolumeOutput.textContent = SoulsAlertAudioVolume.value;

	let NecrosisAlertAudioVolumeOutput = document.querySelector('#NecrosisAlertAudioVolumeOutput');
	let NecrosisAlertAudioVolume: any = document.querySelector('#NecrosisAlertAudioVolume');
	NecrosisAlertAudioVolume.value = getSetting('necrosisAlertAudioVolume');
	NecrosisAlertAudioVolumeOutput.textContent = NecrosisAlertAudioVolume.value;
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
});

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
	jobGauge.style.setProperty('--scale', getSetting('jobGaugeScale'));
	conjures.style.setProperty('--scale', getSetting('conjureScale'));
	souls.style.setProperty('--scale', getSetting('soulScale'));
	bloat.style.setProperty('--scale', getSetting('bloatScale'));
	livingDeath.style.setProperty('--scale', getSetting('livingDeathScale'));
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
		.getElementById('LivingDeathScale')
		.setAttribute('value', getSetting('livingDeathScale'));

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

	let LivingDeathScaleValue = document.querySelector('#LivingDeathScaleOutput');
	let LivingDeathScaleInput: any = document.querySelector('#LivingDeathScale');
	LivingDeathScaleValue.textContent = LivingDeathScaleInput.value;

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

let foundBuffs = false;
function findPlayerBuffs() {
	if (buffs.find()) {
		foundBuffs = true;
		if (getSetting('debugMode')) {
			alt1.overLayRect(
				a1lib.mixColor(255, 255, 255),
				getSetting('buffsLocation')[0],
				getSetting('buffsLocation')[1],
				250,
				100,
				50,
				1
			);
		}
		return updateSetting('buffsLocation', [buffs.pos.x, buffs.pos.y]);
	}
}

function getActiveBuffs() {
	if (foundBuffs && getSetting('buffsLocation')) {
		return buffs.read();
	} else {
		findPlayerBuffs();
	}
}

function findBloat() {
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

let soulsAlert: HTMLAudioElement;
let necrosisAlert: HTMLAudioElement;
function playAlert(type: string) {
	if (type === 'souls') {
		soulsAlert = new Audio(alarms[getSetting('soulsAlertAudio')]);
		soulsAlert.loop = getSetting('loopCappedSoulsAlert');
		soulsAlert.volume = Number(getSetting('soulsAlertAudioVolume'))/100;
		soulsAlert.play();
	}
	if (type == 'necrosis') {
		necrosisAlert = new Audio(alarms[getSetting('necrosisAlertAudio')]);
		necrosisAlert.loop = getSetting('loopCappedNecrosisAlert');
		necrosisAlert.volume = Number(getSetting('necrosisAlertAudioVolume'))/100;
		necrosisAlert.play();
	}
}

function findNecrosisCount(buffs: BuffReader.Buff[]) {
	let necrosisCount = 0;
	let lastNecrosisCount = Number(necrosis.dataset.stacks);
	let maxNecrosisCount = 12;

	for (let [_key, value] of Object.entries(buffs)) {
		let necrosisBuff = value.countMatch(buffImages.necrosis, false);
		if (necrosisBuff.passed > 140) {
			necrosisCount = value.readTime();
		}
	}

	necrosis.dataset.stacks = necrosisCount.toString();

	if (
		necrosisCount === maxNecrosisCount &&
		lastNecrosisCount != maxNecrosisCount &&
		getSetting('playCappedNecrosisAlert')
	) {
		playAlert('necrosis');
	} else if (lastNecrosisCount == maxNecrosisCount) {
		return;
	} else {
		if (necrosisAlert) {
			necrosisAlert.pause();
			necrosisAlert.currentTime = 0;
		}
	}

	return necrosisCount;
}

function findLivingDeath(buffs: BuffReader.Buff[]) {
	let livingDeathTimer = 0;

	for (let [_key, value] of Object.entries(buffs)) {
		let livingDeathBuff = value.countMatch(buffImages.livingDeath, false);
		if (livingDeathBuff.passed > 150) {
			livingDeath.classList.remove('cooldown');
			livingDeathTimer = value.readTime();
		}
	}

	livingDeath.dataset.timer = livingDeathTimer.toString();

	if (livingDeathTimer > 10) {
		livingDeath.dataset.cast = '1';
	}

	/* Once Living Death has ended */
	if (livingDeathTimer == 0) {
		livingDeath.classList.add('inactive');
		/* When Living Death activity starts we set that the Player has cast the ability */
		if (livingDeath.dataset.cast == '1' && !(getSetting('livingDeathCooldown'))) {
			/* Unset value for next detection */
			livingDeath.dataset.cast = '0';

			/* Start a 60 second cooldown - the length of Living Death assuming the full 30s was used. */
			livingDeath.dataset.remaining = '60';
			livingDeath.classList.add('cooldown');
			startLivingDeathCooldownTimer();
		}
	} else {
		livingDeath.classList.remove('inactive');
	}

	return livingDeathTimer;
}

/* We only want to call once - so use a global variable to track if we've called it */
var startedLivingDeathCooldownTimer = false;
function startLivingDeathCooldownTimer() {
	if (!startedLivingDeathCooldownTimer) {
		startedLivingDeathCooldownTimer =
			true; /* Prevent stacking countdowns every 150ms */
		finalCountdown(livingDeath, 60);
	}
	setTimeout(() => {
		livingDeath.classList.remove('cooldown');
		livingDeath.dataset.remaining = '60';
		startedLivingDeathCooldownTimer = false;
	}, 60000);
}

function findSoulCount(buffs: BuffReader.Buff[]) {
	let soulsCount = 0;
	let lastSoulsCount = Number(souls.dataset.souls);
	let maxSoulsCount = 3;
	if (getSetting('offhand95')) {
		maxSoulsCount = 5;
	}

	for (let [_key, value] of Object.entries(buffs)) {
		let soulsBuff = value.countMatch(buffImages.residual_soul, false);
		if (soulsBuff.passed > 200) {
			soulsCount = value.readTime();
		}
	}
	souls.dataset.souls = soulsCount.toString();


	if (
		soulsCount === maxSoulsCount &&
		lastSoulsCount != maxSoulsCount &&
		getSetting('playCappedSoulsAlert')
	) {
		playAlert('souls');
	} else if (lastSoulsCount == maxSoulsCount) {
		return;
	} else {
		if (soulsAlert) {
			soulsAlert.pause();
			soulsAlert.currentTime = 0;
		}
	}

	return soulsCount;
}

var startedSkeleton12sTimer = false;
var startedZombie12sTimer = false;
var startedGhost12sTimer = false;
function findConjures(buffs: BuffReader.Buff[]) {
	let foundSkeleton = false;
	let foundZombie = false;
	let foundGhost = false;

	for (let [_key, value] of Object.entries(buffs)) {
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

	let foundConjures = [foundSkeleton, foundZombie, foundGhost];
	skeleton_conjure.classList.toggle('active', foundConjures[0]);
	zombie_conjure.classList.toggle('active', foundConjures[1]);
	ghost_conjure.classList.toggle('active', foundConjures[2]);

	let forcedConjures = <HTMLInputElement>(document.getElementById('ForcedConjures'));
	if (forcedConjures.checked) {
		let skeletonFinal12 = skeleton_conjure.dataset.timer;
		let zombieFinal12 = zombie_conjure.dataset.timer;
		let ghostFinal12 = ghost_conjure.dataset.timer;

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

	return [foundSkeleton, foundZombie, foundGhost];
}

/* Used to count timers down that we have lost track of via Alt1 */
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

let settingsButton = document.getElementById('SettingsButton');
settingsButton.addEventListener('click', toggleSettings);

let checkboxFields: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[type="checkbox"]');
checkboxFields.forEach((checkbox) => {
	checkbox.addEventListener('click', (e) => {
			updateSetting(checkbox.dataset.setting, checkbox.checked);
		})
});

let playCappedSoulsAlert = <HTMLInputElement>(
	document.getElementById('PlayCappedSoulsAlert')
);
playCappedSoulsAlert.addEventListener('click', () => {
	if (!playCappedSoulsAlert.checked) {
		soulsAlert.pause();
		soulsAlert.currentTime = 0;
	}
});

let playCappedNecrosisAlert = <HTMLInputElement>(
	document.getElementById('PlayCappedNecrosisAlert')
);
playCappedNecrosisAlert.addEventListener('click', () => {
	if (!playCappedNecrosisAlert.checked) {
		necrosisAlert.pause();
		necrosisAlert.currentTime = 0;
	}
});

let audioFileSelectors: NodeListOf<HTMLSelectElement> = document.querySelectorAll('select.audio-file');
audioFileSelectors.forEach((fileSelector) => {
	fileSelector.addEventListener('change', () => {
		updateSetting(fileSelector.dataset.setting, fileSelector.value);
	})
});

var colorFields: any = document.getElementsByClassName('colors');
for (let color of colorFields) {
	color.addEventListener('input', (e) => {
		updateSetting(e.target.dataset.setting, e.target.value);
	});
}

var scaleSliderFields: any = document.querySelectorAll('input[type="range"].scale');
scaleSliderFields.forEach((scaleSlider) => {
	scaleSlider.addEventListener('input', (event) => {
		updateSetting(scaleSlider.dataset.setting, event.target.value);
	})
});

var SoulsAlertAudioVolume: any = document.querySelector('#SoulsAlertAudioVolume');
SoulsAlertAudioVolume.addEventListener('input', (event) => {
	updateSetting('soulsAlertAudioVolume', event.target.value);
	soulsAlert.volume = Number(getSetting('soulslertAudioVolume')) / 100;
});

var NecrosisAlertAudioVolume: any = document.querySelector('#NecrosisAlertAudioVolume');
NecrosisAlertAudioVolume.addEventListener('input', (event) => {
	updateSetting('necrosisAlertAudioVolume', event.target.value);
	necrosisAlert.volume = Number(getSetting('necrosisAlertAudioVolume')) / 100;
});

let resetAllSettingsButton = document.getElementById('ResetAllSettings');
resetAllSettingsButton.addEventListener('click', () => {
	localStorage.removeItem('nyusNecroJobGauge');
	localStorage.clear();
	initSettings();
	location.reload();
});

/* End Settings */

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed
		alt1.identifyAppUrl('./appconfig.json');
		initSettings();
		startJobGauge();
		if (getSetting('activeOverlay')) {
			connectToWebSocket();
		}
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
};
