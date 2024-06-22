// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as BuffReader from 'alt1/buffs';
import * as TargetMob from 'alt1/targetmob';
import html2canvas from 'html2canvas';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/jobgauge.css';

var buffs = new BuffReader.default();
var targetDisplay = new TargetMob.default();
var currentOverlayPosition = getSetting('overlayPosition');

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

	skeleton_warrior: require('./asset/data/skeleton_warrior-top.data.png'),
	putrid_zombie: require('./asset/data/putrid_zombie-top.data.png'),
	vengeful_ghost: require('./asset/data/vengeful_ghost-top.data.png'),

	bloated: require('./asset/data/bloated.data.png'),
});

var equipmentImages = a1lib.webpackImages({
	offhand95: require('./asset/data/Augmented_Soulbound_lantern.data.png'),
});

let inCombat = false;
let checkForTarget = getSetting('checkForTarget');
let timeUntilHide = 2;
let checkCombatState = () => {
	let haveBuffs = buffs.read().length;
	//If we don't have a target we aren't in combat (except for target cycle bug...)
	if (targetDisplay && checkForTarget) {
		targetDisplay.read();
		if (targetDisplay.state === null) {
			timeUntilHide = 0;
			inCombat = false;
		} else {
			timeUntilHide = 2;
			inCombat = true;
		}
	}
	// If we aren't checking to see if we have a target - pretend we always do
	if (!checkForTarget && haveBuffs) {
		timeUntilHide = 2;
		inCombat = true;
	}
	if (!haveBuffs) {
		// We either have no buffs or they aren't visible (eg. banking) so aren't in combat
		if (timeUntilHide == 0) {
			inCombat = false;
		} else {
			setTimeout(() => {
				if (timeUntilHide > 0) {
					timeUntilHide--;
				}
			}, 1000);
		}
	}
};

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
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay && getSetting('activeOverlay')) {
		output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}

	startLooping();
}

function createCanvas() {
	let overlayCanvas = document.createElement('canvas');
	overlayCanvas.id = 'OverlayCanvas';

	let jg = document.getElementById('JobGauge');
	let jobGaugeWidth = jg.offsetWidth;
	let jobGaugeHeight = jg.offsetHeight;
	overlayCanvas.width = jobGaugeWidth;
	overlayCanvas.height = jobGaugeHeight;
	return overlayCanvas;
}

function captureOverlay() {
	let overlayCanvas = createCanvas();
	html2canvas(document.querySelector('#JobGauge'), {
		allowTaint: true,
		canvas: overlayCanvas,
		backgroundColor: 'transparent',
		useCORS: true,
		removeContainer: true,
	})
		.then((canvas) => {
			try {
				paintCanvas(canvas);
			} catch (e) {
				console.log('Error saving image? ' + e);
			}
		})
		.catch(() => {
			console.log('Overlay failed to capture.');
		});
}

function paintCanvas(canvas: HTMLCanvasElement) {
	let overlayCanvasOutput = document.getElementById('OverlayCanvasOutput');
	let overlayCanvasContext = overlayCanvasOutput
		.querySelector('canvas')
		.getContext('2d', { willReadFrequently: true });
	overlayCanvasContext.clearRect(0, 0, canvas.width, canvas.height);
	overlayCanvasContext.drawImage(canvas, 0, 0);
}

let maxAttempts = 10;
function startLooping() {
	if (getSetting('activeOverlay')) {
		startOverlay();
	} else {
		alt1.overLayContinueGroup('jobGauge');
		alt1.overLayClearGroup('jobGauge');
		alt1.overLaySetGroup('jobGauge');
	}
	const interval = setInterval(() => {
		let buffs = getActiveBuffs();

		// TODO: Benchmark this vs reading the setting from localStorage as I'm currently guessing which is faster here
		let necrosisTracker = <HTMLInputElement>(
			document.getElementById('NecrosisTracker')
		);
		let soulsTracker = <HTMLInputElement>(
			document.getElementById('SoulStracker')
		);
		let conjureTracker = <HTMLInputElement>(
			document.getElementById('ConjuresTracker')
		);
		let livingDeathTracker = <HTMLInputElement>(
			document.getElementById('LivingDeathTracker')
		);
		let bloatTracker = <HTMLInputElement>(
			document.getElementById('BloatTracker')
		);
		if (buffs) {
			checkCombatState();
			if (!necrosisTracker.checked) {
				findNecrosisCount(buffs);
			}
			if (!soulsTracker.checked) {
				findSoulCount(buffs);
			}
			if (!livingDeathTracker.checked) {
				findLivingDeath(buffs);
			}
			if (!conjureTracker.checked) {
				findConjures(buffs);
			}
			if (!bloatTracker.checked) {
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
			if (maxAttempts > 0) {
				maxAttempts--;
				setTimeout(() => {}, 3000);
			}
			console.log(
				`Failed to read buffs - attempting again. Attempts left: ${maxAttempts}.`
			);
		}
	}, getSetting('loopSpeed'));
	``;
}

let posBtn = document.getElementById('OverlayPosition');
posBtn.addEventListener('click', setOverlayPosition);
async function setOverlayPosition() {
	let jg = document.getElementById('JobGauge');
	let jobGaugeWidth = jg.offsetWidth;
	let jobGaugeHeight = jg.offsetHeight;

	a1lib.once('alt1pressed', updateLocation);
	updateSetting('updatingOverlayPosition', true);
	while (getSetting('updatingOverlayPosition')) {
		alt1.overLaySetGroup('overlayPositionHelper');
		alt1.overLayRect(
			a1lib.mixColor(255, 255, 255),
			Math.floor(
				a1lib.getMousePosition().x -
					((getSetting('jobGaugeScale') / 100) * jobGaugeWidth) / 2
			),
			Math.floor(
				a1lib.getMousePosition().y -
					((getSetting('jobGaugeScale') / 100) * jobGaugeHeight) / 2
			),
			Math.floor((getSetting('jobGaugeScale') / 100) * jobGaugeWidth),
			Math.floor((getSetting('jobGaugeScale') / 100) * jobGaugeHeight),
			200,
			2
		);
		await new Promise((done) => setTimeout(done, 200));
	}
}

function updateLocation(e) {
	let jg = document.getElementById('JobGauge');
	let jobGaugeWidth = jg.offsetWidth;
	let jobGaugeHeight = jg.offsetHeight;
	updateSetting('overlayPosition', {
		x: Math.floor(
			e.x - (getSetting('jobGaugeScale') / 100) * (jobGaugeWidth / 2)
		),
		y: Math.floor(
			e.y - (getSetting('jobGaugeScale') / 100) * (jobGaugeHeight / 2)
		),
	});
	updateSetting('updatingOverlayPosition', false);
	currentOverlayPosition = getSetting('overlayPosition');
	alt1.overLayClearGroup('overlayPositionHelper');
}

export async function startOverlay() {
	let cnv = document.createElement('canvas');
	let ctx = cnv.getContext('2d', { willReadFrequently: true });
	let overlay = <HTMLCanvasElement>document.getElementsByTagName('canvas')[0];

	while (true) {
		captureOverlay();

		let overlayPosition = currentOverlayPosition;

		let jg = document.getElementById('JobGauge');
		let jobGaugeWidth = jg.offsetWidth;
		let jobGaugeHeight = jg.offsetHeight;

		alt1.overLaySetGroup('jobGauge');
		alt1.overLayFreezeGroup('jobGauge');
		cnv.width = jobGaugeWidth;
		cnv.height = jobGaugeHeight;
		/* If I try and use the overlay instead of copying the overlay it doesn't work. No idea why. */
		ctx.drawImage(overlay, 0, 0);

		let data = ctx.getImageData(0, 0, cnv.width, cnv.height);

		alt1.overLayClearGroup('jobGauge');
		if (inCombat) {
			alt1.overLayImage(
				overlayPosition.x,
				overlayPosition.y,
				a1lib.encodeImageString(data),
				data.width,
				125
			);
			alt1.overLayRefreshGroup('jobGauge');
		} else {
			alt1.overLayClearGroup('jobGauge');
			alt1.overLayRefreshGroup('jobGauge');
		}

		await new Promise((done) => setTimeout(done, 125));
	}
}

function initSettings() {
	if (!localStorage.nyusNecroJobGauge) {
		setDefaultSettings();
		checkForT95();
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
			checkForTarget: true,
			conjureScale: 100,
			conjuresTracker: false,
			debugMode: false,
			forcedConjures: true,
			gappedNecrosis: false,
			ghostSettings: false,
			jobGaugeScale: 100,
			lastOverlayFrame: '',
			livingdDeathTracker: false,
			livingDeathCooldown: false,
			livingDeathPlacement: false,
			livingDeathScale: 100,
			loopCappedNecrosisAlert: false,
			loopCappedSoulsAlert: false,
			loopSpeed: 125,
			necrosisAlertAudio: './resource/alarms/notification1.wav',
			necrosisAlertAudioVolume: 100,
			necrosisCappedBgColor: '#ff0000',
			necrosisDefaultBgColor: '#9205e4',
			necrosisFreecastBgColor: '#fd7d00',
			necrosisScale: 100,
			necrosisTracker: false,
			offhand95: false,
			overlayOpacity: 1.0,
			overlayPosition: { x: 100, y: 100 },
			playCappedNecrosisAlert: false,
			playCappedSoulsAlert: false,
			singleNecrosis: false,
			soulBgColor: '#52f9fa',
			soulsAlertAudio: './resource/alarms/notification1.wav',
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
	setCheckForTargetButton();
	setSingleNecrosis();
	setNecrosisGap();
	setLivingDeathCooldown();
	setLivingDeathPlacement();
	setAlerts();
	setOverlay();
	setCustomColors();
	setCustomScale();
	setLoopSpeed();
}

function setTrackerComponents() {
	let checkboxFields: NodeListOf<HTMLInputElement> =
		document.querySelectorAll('.tracker.setting');
	checkboxFields.forEach((checkbox) => {
		checkbox.checked = Boolean(getSetting(checkbox.dataset.setting));
	});

	let trackerComponents: NodeListOf<HTMLElement> =
		document.querySelectorAll('.tracker.component');
	trackerComponents.forEach((component) => {
		component.classList.toggle(
			'tracked',
			!Boolean(getSetting(component.dataset.setting))
		);
	});
}

function checkForT95() {
	let of95found = a1lib.findSubimage(
		a1lib.captureHoldFullRs(),
		equipmentImages.offhand95
	);
	let soulsCap = <HTMLInputElement>document.getElementById('SoulsCap');
	if (of95found.length > 0) {
		updateSetting('offhand95', true);
		soulsCap.innerHTML = '5';
	}
}

function setOffhand() {
	let offhand = <HTMLInputElement>document.getElementById('Offhand');
	let soulsCap = <HTMLInputElement>document.getElementById('SoulsCap');
	setCheckboxChecked(offhand);
	souls.classList.toggle('t90', !Boolean(getSetting('offhand95')));
	if (offhand.checked) {
		soulsCap.innerHTML = '5';
	} else {
		soulsCap.innerHTML = '3';
	}
	offhand.addEventListener('click', () => {
		if (getSetting('offhand95')) {
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
	});
}

function setForcedConjures() {
	let forcedConjures = <HTMLInputElement>(
		document.getElementById('ForcedConjures')
	);
	setCheckboxChecked(forcedConjures);
}

function setGhostSettingsButton() {
	let settingsButton = document.getElementById('SettingsButton');
	let ghostSettings = <HTMLInputElement>(
		document.getElementById('GhostSettings')
	);
	setCheckboxChecked(ghostSettings);
	settingsButton.classList.toggle(
		'ghost',
		Boolean(getSetting('ghostSettings'))
	);
}

function setCheckForTargetButton() {
	let checkForTargetSetting = <HTMLInputElement>(
		document.getElementById('CheckForTarget')
	);
	setCheckboxChecked(checkForTargetSetting);
	checkForTargetSetting.addEventListener('click', () => {
		checkForTarget = checkForTargetSetting.checked;
	});
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
	playCappedNecrosisAlert.checked = Boolean(
		getSetting('playCappedNecrosisAlert')
	);

	let loopCappedNecrosisAlert = <HTMLInputElement>(
		document.getElementById('LoopCappedNecrosisAlert')
	);
	setCheckboxChecked(loopCappedNecrosisAlert);

	let soulsAlertAudio = <HTMLInputElement>(
		document.getElementById('SoulsAlertAudio')
	);
	soulsAlertAudio.value = getSetting('soulsAlertAudio');

	let necrosisAlertAudio = <HTMLInputElement>(
		document.getElementById('NecrosisAlertAudio')
	);
	necrosisAlertAudio.value = getSetting('necrosisAlertAudio');

	/* Volume */
	let SoulsAlertAudioVolumeOutput = document.querySelector(
		'#SoulsAlertAudioVolumeOutput'
	);
	let SoulsAlertAudioVolume: any = document.querySelector(
		'#SoulsAlertAudioVolume'
	);
	SoulsAlertAudioVolume.value = getSetting('soulsAlertAudioVolume');
	SoulsAlertAudioVolumeOutput.textContent = SoulsAlertAudioVolume.value;

	let NecrosisAlertAudioVolumeOutput = document.querySelector(
		'#NecrosisAlertAudioVolumeOutput'
	);
	let NecrosisAlertAudioVolume: any = document.querySelector(
		'#NecrosisAlertAudioVolume'
	);
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

function setOverlay() {
	let showOverlay = <HTMLInputElement>document.getElementById('ShowOverlay');
	setCheckboxChecked(showOverlay);
	jobGauge.classList.toggle('overlay', Boolean(getSetting('activeOverlay')));
	showOverlay.addEventListener('change', function () {
		location.reload();
	});
}

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

	let LivingDeathScaleValue = document.querySelector(
		'#LivingDeathScaleOutput'
	);
	let LivingDeathScaleInput: any =
		document.querySelector('#LivingDeathScale');
	LivingDeathScaleValue.textContent = LivingDeathScaleInput.value;

	let NecrosisScaleValue = document.querySelector('#NecrosisScaleOutput');
	let NecrosisScaleInput: any = document.querySelector('#NecrosisScale');
	NecrosisScaleValue.textContent = NecrosisScaleInput.value;
}

function setLoopSpeed() {
	if (getSetting('loopSpeed') == '') {
		updateSetting('loopSpeed', 125);
	}

	let loopSpeed = <HTMLInputElement>document.getElementById('LoopSpeed');
	loopSpeed.value = getSetting('loopSpeed');

	document
		.getElementById('LoopSpeed')
		.setAttribute('value', getSetting('loopSoeed'));

	let LoopSpeedValue = document.querySelector('#LoopSpeedOutput');
	let LoopSpeedInput: any = document.querySelector('#LoopSpeed');
	LoopSpeedValue.textContent = LoopSpeedInput.value;
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
				306,
				78,
				500,
				2
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
		soulsAlert.volume = Number(getSetting('soulsAlertAudioVolume')) / 100;
		soulsAlert.play();
	}
	if (type == 'necrosis') {
		necrosisAlert = new Audio(alarms[getSetting('necrosisAlertAudio')]);
		necrosisAlert.loop = getSetting('loopCappedNecrosisAlert');
		necrosisAlert.volume =
			Number(getSetting('necrosisAlertAudioVolume')) / 100;
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
		if (
			livingDeath.dataset.cast == '1' &&
			!getSetting('livingDeathCooldown')
		) {
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
		if (skeletonCheck.passed > 150) {
			foundSkeleton = true;
			skeleton_conjure.dataset.timer = value.readTime().toString();
		}

		let zombieCheck = value.countMatch(buffImages.putrid_zombie, false);
		if (zombieCheck.passed > 150) {
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

	let forcedConjures = <HTMLInputElement>(
		document.getElementById('ForcedConjures')
	);
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

let checkboxFields: NodeListOf<HTMLInputElement> = document.querySelectorAll(
	'input[type="checkbox"]'
);
checkboxFields.forEach((checkbox) => {
	checkbox.addEventListener('click', (e) => {
		updateSetting(checkbox.dataset.setting, checkbox.checked);
	});
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

let audioFileSelectors: NodeListOf<HTMLSelectElement> =
	document.querySelectorAll('select.audio-file');
audioFileSelectors.forEach((fileSelector) => {
	fileSelector.addEventListener('change', () => {
		updateSetting(fileSelector.dataset.setting, fileSelector.value);
	});
});

var colorFields: any = document.getElementsByClassName('colors');
for (let color of colorFields) {
	color.addEventListener('input', (e) => {
		updateSetting(e.target.dataset.setting, e.target.value);
	});
}

var scaleSliderFields: any = document.querySelectorAll(
	'input[type="range"].scale'
);
scaleSliderFields.forEach((scaleSlider) => {
	scaleSlider.addEventListener('input', (event) => {
		updateSetting(scaleSlider.dataset.setting, event.target.value);
	});
});

var SoulsAlertAudioVolume: any = document.querySelector(
	'#SoulsAlertAudioVolume'
);
SoulsAlertAudioVolume.addEventListener('input', (event) => {
	updateSetting('soulsAlertAudioVolume', event.target.value);
	soulsAlert.volume = Number(getSetting('soulslertAudioVolume')) / 100;
});

var NecrosisAlertAudioVolume: any = document.querySelector(
	'#NecrosisAlertAudioVolume'
);
NecrosisAlertAudioVolume.addEventListener('input', (event) => {
	updateSetting('necrosisAlertAudioVolume', event.target.value);
	necrosisAlert.volume = Number(getSetting('necrosisAlertAudioVolume')) / 100;
});

var loopSpeed: any = document.querySelector('#LoopSpeed');
loopSpeed.addEventListener('change', (event) => {
	updateSetting('loopSpeed', event.target.value);
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
