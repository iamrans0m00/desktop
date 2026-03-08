
const { electron } = require('./api');

window.api = {
	...electron,

	// ── Units ─────────────────────────────────────────────────────────────
	getUnits: () => electron.appSettings.get('preferences.units', 'metric'),
	setUnits: (units) => electron.appSettings.set('preferences.units', units),

	// ── Road Feel ─────────────────────────────────────────────────────────
	// Returns { mode, surface, intensity }
	getRoadFeel: () => electron.appSettings.get('preferences.roadFeel', {
		mode: 'auto',
		surface: 'Road',
		intensity: 100,
	}),
	// Accepts { mode, surface, intensity }
	setRoadFeel: (rf) => electron.appSettings.set('preferences.roadFeel', rf),
};

window.electron = electron;
