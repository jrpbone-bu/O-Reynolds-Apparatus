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

Part descriptions and the deployment QR code are outside this first model pass.
