# EVChargeChain — Blockchain-Based EV Charging Cooperation Model

## Major-project dashboard

This version is designed as a **research/demo prototype**, not a one-click animation.

### Main workflow

1. Enter an EV's battery level, required energy and location.
2. Load mapped charging stations from OpenStreetMap through the server.
3. Click a station marker and select it.
4. Run the charging planner to calculate distance and a simulated waiting-time decision.
5. If cooperation is required, dispatch an MCS; the system checks distance, cost, status and available energy.
6. Create a signed charging transaction and run the 2/3 verifier rule.
7. Commit the verified transaction into the traffic blockchain.
8. Simulate malicious verifier rounds and observe trust decay/exclusion.
9. Record cooperation contributions and distribute the demo reward pool.
10. Run the research analytics for waiting time vs MCS count and trust decay.

## Run

```bash
npm install
npm start
```

Open:

http://localhost:3000

## Research-support scripts

```bash
python cooperation-chain/shapley.py
python simulation/waiting_time.py
python simulation/long_distance.py
python simulation/attacks.py
```

## Map data

The dashboard queries OpenStreetMap via the Overpass API for objects tagged `amenity=charging_station` in the Bengaluru bounding box. OpenStreetMap documents `amenity=charging_station` as the tag for EV charging locations and supports fields such as brand, operator, capacity and socket information. Availability shown by this prototype is not claimed to be real-time.

If the Overpass request is unavailable, the dashboard uses clearly labelled prototype fallback points.

## Research honesty

The project is a prototype implementation. The blockchain, consensus and trust mechanisms are simplified versions suitable for an academic demonstration. The research analytics use synthetic/prototype experiment data unless you replace them with an approved real dataset.

For a paper, report:
- exact parameters,
- dataset source,
- number of runs,
- random seeds,
- baselines,
- metrics,
- limitations,
- and which mechanisms are simplified.


## New major-project demonstration features

- Road route from the EV to the selected charging station using OSRM route geometry when available.
- Turn-by-turn route summary in the dashboard.
- Animated MCS marker that moves along the route as a dispatch simulation.
- Cooperation point system and charging-station leaderboard.
- Award history showing why each station received points.
- Points are intentionally shown separately from the blockchain contribution score so the incentive layer is easy to explain.

OSRM's Route service is designed to find a road route between supplied coordinates and can return GeoJSON route geometry and route steps. See the official documentation: https://project-osrm.org/docs/
