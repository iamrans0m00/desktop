/**
 * RoadFeel feature
 *
 * Main-process side:
 *   - Listens for `road-feel-apply` IPC calls from the renderer
 *   - Reads the current preferences.roadFeel settings
 *   - Emits `road-feel-applied` back to confirm
 *
 * Renderer side (via registerRenderer):
 *   - Exposes `electron.roadFeel.apply(surface, intensity)` for the React app
 *   - Exposes `electron.roadFeel.getSettings()` to read current prefs
 *
 * The actual BleTacxAdapter.setRoadFeel() call happens in the renderer:
 * the React app's ride layer should:
 *   1. Subscribe to RouteDisplayService 'surface-change' event
 *   2. Call window.electron.roadFeel.applyFromSurface(surfaceName)
 *      which resolves the intensity from settings and calls the adapter.
 *
 * In manual mode, the adapter is called once at ride start with the fixed surface.
 * In auto mode, it is called each time the surface changes.
 */

const Feature = require('../base')
const AppSettings = require('../AppSettings')
const { ipcMain } = require('electron')
const { ipcCall, ipcResponse } = require('../utils')

// RoadFeelSurface enum values (must match incyclist-devices consts.ts)
const SURFACE_VALUES = {
    Off:             0,
    Road:            1,
    CobblestoneHard: 2,
    CobblestoneEasy: 3,
    BrickRoad:       4,
    Gravel:          5,
    Ice:             6,
    WoodenPlanks:    7,
    GravelLight:     8,
    GravelDeep:      9,
    Snow:            10,
}

const DEFAULT_ROAD_FEEL = { mode: 'auto', surface: 'Road', intensity: 100 }

function getRoadFeelSettings() {
    const settings = AppSettings.getInstance()
    // AppSettings.getValue(settings.settings, key, defValue) via static helper
    const raw = AppSettings.getValue(settings.settings ?? settings.loadSettings({lazy:true}), 'preferences.roadFeel', DEFAULT_ROAD_FEEL)
    return raw ?? DEFAULT_ROAD_FEEL
}

class RoadFeelFeature extends Feature {
    static _instance

    static getInstance() {
        if (!RoadFeelFeature._instance)
            RoadFeelFeature._instance = new RoadFeelFeature()
        return RoadFeelFeature._instance
    }

    /**
     * Return effective { surface, intensity } for the renderer to apply.
     * surfaceName: string from RouteDisplayService 'surface-change' event
     *              (undefined means no surface data → use settings fallback)
     */
    resolveRoadFeel(surfaceName) {
        const prefs = getRoadFeelSettings()
        const mode      = prefs.mode      ?? 'auto'
        const intensity = prefs.intensity ?? 100

        if (mode === 'manual') {
            // Manual: always use the configured surface, ignoring incoming data
            return { surface: SURFACE_VALUES[prefs.surface] ?? 1, intensity }
        }

        // Auto: use the surface from the route data; fall back to prefs.surface
        const resolved = surfaceName ?? prefs.surface ?? 'Road'
        return { surface: SURFACE_VALUES[resolved] ?? 1, intensity }
    }

    // ── Main-process registration ────────────────────────────────────────

    register() {
        // road-feel-resolve: renderer asks main to resolve { surface, intensity }
        // given a raw surface name (from surface-change event)
        ipcMain.on('road-feel-resolve', (event, callId, surfaceName) => {
            try {
                const result = this.resolveRoadFeel(surfaceName)
                ipcResponse(event.sender, 'road-feel-resolve', callId, result)
            } catch (err) {
                ipcResponse(event.sender, 'road-feel-resolve', callId, { surface: 1, intensity: 100 })
            }
        })

        // road-feel-get-settings: renderer reads current prefs
        ipcMain.on('road-feel-get-settings', (event, callId) => {
            ipcResponse(event.sender, 'road-feel-get-settings', callId, getRoadFeelSettings())
        })
    }

    // ── Renderer-process registration ────────────────────────────────────

    registerRenderer(spec, ipcRenderer) {
        spec.roadFeel = {}

        // Resolve a surface name → { surface (number), intensity }
        // The React app calls this, then calls adapter.setRoadFeel(surface, intensity)
        spec.roadFeel.resolve = ipcCall('road-feel-resolve', ipcRenderer)

        // Read the stored prefs object { mode, surface, intensity }
        spec.roadFeel.getSettings = ipcCall('road-feel-get-settings', ipcRenderer)

        spec.registerFeatures(['roadFeel'])
    }
}

module.exports = RoadFeelFeature
