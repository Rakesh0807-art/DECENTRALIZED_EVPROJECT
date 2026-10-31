import numpy as np
import json

def simulate_waiting_time(num_evs=60, num_chargers=4, num_mcs=0, arrival_sigma=120, seed=42):
    rng = np.random.default_rng(seed)
    arrivals = rng.normal(loc=180, scale=arrival_sigma, size=num_evs)
    arrivals.sort()
    service = rng.uniform(60, 120, size=num_evs)

    capacity = num_chargers + num_mcs
    free_at = np.zeros(capacity)
    waits = []

    for i, arrival in enumerate(arrivals):
        server = np.argmin(free_at)
        start = max(arrival, free_at[server])
        waits.append(start - arrival)
        free_at[server] = start + service[i]

    return float(np.mean(waits))

if __name__ == "__main__":
    results = []
    for mcs in range(13):
        wait = simulate_waiting_time(num_mcs=mcs)
        results.append({"mcs": mcs, "averageWaitMinutes": round(wait, 2)})
    print(json.dumps(results, indent=2))