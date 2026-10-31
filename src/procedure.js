// PDF mapping assumptions: main/lower reservoir = Lower Water Tank & Water Pump;
// dye tank / straight dye valve = Dye Injection Site (no separate valve modeled);
// overflow ball valves = rear Control Valves; main gate valve = red handwheel;
// B3 uses Dye Injection Site as the stand-in for the unmodeled dye valve.
// upper supply tank = Upper Water Tank. Electrical outlet is not modeled;
// A3 frames the pump, while highlighting the associated lower and upper tanks.
// General reference material, not from the client's PDF; opt in if needed.
export const SHOW_REYNOLDS_NOTE=false;
export const phases={A:'Initial Setup and Preparation',B:'System Configuration and Operation',C:'Post-Operation and Cleanup'};
export default [
  {
    "id": "A1",
    "phase": "A",
    "number": 1,
    "title": "Choose a well-lit spot",
    "text": "Place the apparatus in a well-lit area inside the laboratory to ensure clear flow visualization.",
    "parts": [],
    "focus": "overview"
  },
  {
    "id": "A2",
    "phase": "A",
    "number": 2,
    "title": "Fill water and dye",
    "text": "Fill the main water reservoir with sufficient water and fill the dye tank with a prepared dye-water mixture (1:10 concentration ratio).",
    "parts": [
      "Lower Water Tank & Water Pump",
      "Dye Injection Site"
    ],
    "focus": "overview"
  },
  {
    "id": "A3",
    "phase": "A",
    "number": 3,
    "title": "Switch on the pump",
    "text": "Connect the water pump to the main electrical outlet to begin pumping water from the lower reservoir to the upper supply tank.",
    "parts": [
      "Lower Water Tank & Water Pump",
      "Upper Water Tank"
    ],
    "focus": "pump"
  },
  {
    "id": "A4",
    "phase": "A",
    "number": 4,
    "title": "Set a constant water head",
    "text": "Adjust or set the overflow pipes using the ball valves to maintain the desired constant water level head in the upper tank.",
    "parts": [
      "Control Valve",
      "Upper Water Tank"
    ],
    "focus": "rear"
  },
  {
    "id": "B1",
    "phase": "B",
    "number": 5,
    "title": "Open the water gate valve",
    "text": "Slowly open the main water gate valve to establish the water flow through the transparent visualization section.",
    "parts": [
      "Control Valve",
      "Flow Visualization Pipe Section"
    ],
    "focus": "front"
  },
  {
    "id": "B2",
    "phase": "B",
    "number": 6,
    "title": "Release the dye",
    "text": "Open the straight valve at the dye injection site to allow a steady filament of dye to inject into the centerline of the water stream.",
    "parts": [
      "Dye Injection Site",
      "Pipe for Dye"
    ],
    "focus": "dye"
  },
  {
    "id": "B3",
    "phase": "B",
    "number": 7,
    "title": "Set the flow regime",
    "text": "Gradually adjust both water and dye control valves to achieve different flow regimes (Laminar, Transitional, or Turbulent).",
    "parts": [
      "Control Valve",
      "Dye Injection Site",
      "Flow Visualization Pipe Section"
    ],
    "focus": "front"
  },
  {
    "id": "B4",
    "phase": "B",
    "number": 8,
    "title": "Read the flow rate",
    "text": "Read and record the volumetric flow rate using the flow meter to calculate the corresponding Reynolds Number (N_RE).",
    "parts": [
      "Flow Meter"
    ],
    "focus": "meter"
  },
  {
    "id": "C1",
    "phase": "C",
    "number": 9,
    "title": "Top up the reservoir",
    "text": "If the water level drops significantly during testing, top up the main water reservoir as needed.",
    "parts": [
      "Lower Water Tank & Water Pump"
    ],
    "focus": "overview"
  },
  {
    "id": "C2",
    "phase": "C",
    "number": 10,
    "title": "Shut down",
    "text": "After completing all experimental runs, turn off the pump and close all valves.",
    "parts": [
      "Lower Water Tank & Water Pump",
      "Control Valve"
    ],
    "focus": "overview"
  },
  {
    "id": "C3",
    "phase": "C",
    "number": 11,
    "title": "Drain and dispose",
    "text": "Drain and properly dispose of the used water-dye mixture from the drainage tank to prepare the system for the next user.",
    "parts": [
      "Drainage Tank"
    ],
    "focus": "overview"
  }
];
