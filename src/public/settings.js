// settings.js – loaded by settings.html
// window.api is exposed by preload.js via contextBridge / nodeIntegration

const SURFACE_LABELS = {
    auto:   'Auto: uses companion .surfaces.csv file, then OSM map data, then the fallback surface below.',
    manual: 'Manual: always use the fixed surface below (ignores CSV and OSM data).',
}

function setMode(mode) {
    // Toggle button styles
    document.getElementById('mode-auto').classList.toggle('active',   mode === 'auto')
    document.getElementById('mode-manual').classList.toggle('active', mode === 'manual')

    // Update hint text
    document.getElementById('mode-hint').innerText = SURFACE_LABELS[mode] || ''

    // Update surface label
    document.getElementById('surface-label').innerText =
        mode === 'manual' ? 'Surface:' : 'Fallback surface:'
}

// ── Initialise from stored settings ────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const api = window.api
    if (!api) return

    // Units
    const getUnits = api.getUnits ? api.getUnits() : api.appSettings?.get('preferences.units')
    Promise.resolve(getUnits).then(units => {
        document.getElementById('units').value = units || 'metric'
    }).catch(() => {})

    // Road feel
    const getRF = api.getRoadFeel ? api.getRoadFeel() : api.appSettings?.get('preferences.roadFeel')
    Promise.resolve(getRF).then(rf => {
        rf = rf || {}
        const mode      = rf.mode      || 'auto'
        const surface   = rf.surface   || 'Road'
        const intensity = rf.intensity != null ? rf.intensity : 100

        setMode(mode)
        document.getElementById('surface').value   = surface
        document.getElementById('intensity').value = intensity
        document.getElementById('intensity-val').innerText = intensity + '%'
    }).catch(() => {})
})

// ── Save ───────────────────────────────────────────────────────────────────
function saveSettings() {
    const api = window.api
    if (!api) {
        document.getElementById('status').innerText = 'API not available.'
        return
    }

    const units     = document.getElementById('units').value
    const mode      = document.getElementById('mode-auto').classList.contains('active') ? 'auto' : 'manual'
    const surface   = document.getElementById('surface').value
    const intensity = parseInt(document.getElementById('intensity').value, 10)

    const roadFeel = { mode, surface, intensity }

    // Save units
    const saveUnits = api.setUnits
        ? api.setUnits(units)
        : api.appSettings?.set('preferences.units', units)

    // Save road feel
    const saveRF = api.setRoadFeel
        ? api.setRoadFeel(roadFeel)
        : api.appSettings?.set('preferences.roadFeel', roadFeel)

    Promise.all([
        Promise.resolve(saveUnits).catch(() => {}),
        Promise.resolve(saveRF).catch(() => {}),
    ]).then(() => {
        document.getElementById('status').innerText = 'Settings saved!'
        setTimeout(() => { document.getElementById('status').innerText = '' }, 2000)
    })
}
