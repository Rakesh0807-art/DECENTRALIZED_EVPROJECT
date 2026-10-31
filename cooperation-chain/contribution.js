function calculateContributions(csList, weights = [0.25, 0.25, 0.25, 0.25]) {
  const shapley = {};
  const sums = [0, 0, 0, 0];

  for (const cs of csList) {
    shapley[cs.id] = [cs.contribution.s1, cs.contribution.s2, cs.contribution.s3, cs.contribution.s4];
  }

  for (const values of Object.values(shapley)) {
    values.forEach((v, i) => sums[i] += v);
  }

  const contributionValues = {};
  for (const cs of csList) {
    const s = shapley[cs.id];
    let score = 0;
    s.forEach((v, i) => {
      if (sums[i] > 0) score += weights[i] * (v / sums[i]);
    });
    contributionValues[cs.id] = score;
  }
  return contributionValues;
}

module.exports = { calculateContributions };