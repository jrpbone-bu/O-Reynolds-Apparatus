# Apparatus — 3D study

An interactive Three.js reconstruction of the supplied apparatus photograph.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Drag to rotate; scroll or pinch to zoom.
The controls provide reset, front view, auto-rotation, and zoom buttons.

## Build

```sh
npm run build
```

The `dist` directory is a static website suitable for deployment.

## Model

`src/apparatus.js` builds the complete assembly using named Three.js groups and
geometries. It includes the base, lower column, support rods, transparent packed
chamber, packing spheres, reservoir, upper fittings, and red handwheel assembly.
Dimensions, materials, and obscured surfaces are approximated from one photo.
This is a visual study, not a dimensionally validated engineering model.

The model is grouped by the parts named in the Reynolds Apparatus document
(Dye Injection Site, Pipe for Dye, Upper Water Tank, Control Valve, Flow
Visualization Pipe Section, Flow Meter, Lower Water Tank & Water Pump, Drainage
Tank). Tap or click a part to focus the camera on it and show its description in
the panel at the bottom of the screen; tap empty space to return.

## Checks

```sh
node scripts/check-groups.mjs     # every object is in exactly one part group
node scripts/snapshot-meshes.mjs  # world transform / geometry / material signature
node scripts/check-parts.mjs      # with `npm run dev` running: taps every part
```
