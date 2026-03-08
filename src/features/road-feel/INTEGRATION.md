# Road Feel – React App Integration

The desktop Electron layer is fully wired. To complete the end-to-end
pipeline, the React app (incyclist/app) needs the following snippet added to
its ride page / ride controller, wherever it manages the active device:

```ts
import { useDeviceRide }    from 'incyclist-services'
import { RoadFeelSurface }  from 'incyclist-devices'

// Inside the component / hook that starts and manages a route ride:

useEffect(() => {
    const deviceRide = useDeviceRide()
    const rideService = /* your RouteDisplayService instance */

    async function applyRoadFeel(surfaceName?: string) {
        // Ask main process to resolve settings (mode + intensity)
        const { surface, intensity } = await window.electron.roadFeel.resolve(surfaceName)

        // Call setRoadFeel on the Tacx adapter through the device ride service
        const adapter = deviceRide.getAdapter?.() as any
        if (adapter?.setRoadFeel) {
            adapter.setRoadFeel(surface as RoadFeelSurface, intensity)
        }
    }

    // 1. Apply at ride start (uses initial position surface or settings fallback)
    rideService.on('surface-change', applyRoadFeel)

    return () => {
        rideService.off('surface-change', applyRoadFeel)
    }
}, [])
```

## Settings format (preferences.roadFeel in settings.json)

```json
{
    "preferences": {
        "roadFeel": {
            "mode":      "auto",   // "auto" | "manual"
            "surface":   "Road",   // RoadFeelSurface name (fallback in auto, fixed in manual)
            "intensity": 100       // 0–100 %
        },
        "units": "metric"          // "metric" | "imperial"
    }
}
```

## window.electron.roadFeel API (exposed in renderer)

| Method | Args | Returns | Description |
|--------|------|---------|-------------|
| `resolve(surfaceName?)` | `string \| undefined` | `{ surface: number, intensity: number }` | Resolve a surface name using current settings |
| `getSettings()` | — | `{ mode, surface, intensity }` | Read raw preferences |
