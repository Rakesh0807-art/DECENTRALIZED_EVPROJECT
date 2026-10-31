import numpy as np
import json

BATTERY_CAPACITY_KWH = 65.8
CONSUMPTION_WH_PER_KM = 199

def simulate_route(route_km, charger_positions, mcs_max_travel_km):
    battery = BATTERY_CAPACITY_KWH
    distance = 0.0
    total_driven = 0.0
    events = []

    while distance < route_km:
        step = min(20, route_km - distance)
        distance += step
        battery -= step * CONSUMPTION_WH_PER_KM / 1000
        total_driven += step

        if battery / BATTERY_CAPACITY_KWH < 0.20:
            remaining = min(abs(np.array(charger_positions) - distance),
                            initial=1e9)
            if remaining <= mcs_max_travel_km:
                total_driven += float(remaining)
                battery = BATTERY_CAPACITY_KWH
                events.append({"at_km": round(distance, 2), "type": "MCS/CS recharge"})
            else:
                battery = BATTERY_CAPACITY_KWH
                events.append({"at_km": round(distance, 2), "type": "nearest CS recharge"})

    return total_driven, battery / BATTERY_CAPACITY_KWH, events

if __name__ == "__main__":
    positions = [80, 170, 260, 350]
    results = []
    for max_mcs in [0, 10, 20, 30, 40]:
        d, b, events = simulate_route(400, positions, max_mcs)
        results.append({"mcsTravelKm": max_mcs, "totalDrivingDistance": round(d, 2)})
    print(json.dumps(results, indent=2))