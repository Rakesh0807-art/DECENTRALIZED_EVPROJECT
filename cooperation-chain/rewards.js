function distributeRewards(totalRewardPool, contributionValues) {
  const totalC = Object.values(contributionValues).reduce((a, b) => a + b, 0);
  const rewards = {};

  for (const [csId, c] of Object.entries(contributionValues)) {
    rewards[csId] = totalC > 0 ? totalRewardPool * (c / totalC) : 0;
  }
  return rewards;
}

module.exports = { distributeRewards };