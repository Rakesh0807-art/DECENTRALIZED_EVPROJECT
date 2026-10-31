function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

function findMCSCandidates(ev, mcsList, thresholds = { maxDistance: 20, maxCost: 500 }) {
  return mcsList
    .map(mcs => {
      const distance = haversineKm(ev.location, mcs.location);
      const totalCost = mcs.costPerUnit * ev.requiredEnergy + mcs.callFee;
      return { mcs, distance, totalCost };
    })
    .filter(x =>
      x.mcs.status !== "charging" &&
      x.distance <= thresholds.maxDistance &&
      x.totalCost <= thresholds.maxCost &&
      x.mcs.availableEnergy >= ev.requiredEnergy
    )
    .sort((a, b) => a.distance - b.distance);
}

function matchMCS(ev, mcsList, thresholds) {
  const candidates = findMCSCandidates(ev, mcsList, thresholds);
  if (!candidates.length) return { matched: false, candidates: [] };

  const selected = candidates[0];
  selected.mcs.status = "charging";
  selected.mcs.availableEnergy -= ev.requiredEnergy;

  return {
    matched: true,
    mcsId: selected.mcs.id,
    mcsName: selected.mcs.name,
    distance: Number(selected.distance.toFixed(2)),
    totalCost: Number(selected.totalCost.toFixed(2)),
    candidates: candidates.map(x => ({
      id: x.mcs.id,
      name: x.mcs.name,
      distance: Number(x.distance.toFixed(2)),
      totalCost: Number(x.totalCost.toFixed(2))
    }))
  };
}

module.exports = { haversineKm, findMCSCandidates, matchMCS };