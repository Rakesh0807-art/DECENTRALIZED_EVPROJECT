function contributionWeightedCommit(votingCSIds, contributionValues, threshold = 2 / 3) {
  const total = Object.values(contributionValues).reduce((a, b) => a + b, 0);
  const voted = votingCSIds.reduce((sum, id) => sum + (contributionValues[id] || 0), 0);
  return {
    committed: total > 0 && voted / total >= threshold,
    voteWeight: voted,
    totalWeight: total,
    ratio: total > 0 ? voted / total : 0
  };
}

module.exports = { contributionWeightedCommit };