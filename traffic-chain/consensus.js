function majorityRequired(nodeCount) {
  return Math.ceil(nodeCount / 2);
}

function proposeBlock(leaderCS, verifiedTXs, chain, otherCSNodes = []) {
  const acks = otherCSNodes.filter(cs => cs.id !== leaderCS.id).length;
  const required = majorityRequired(otherCSNodes.length + 1);

  if (acks + 1 >= required) {
    return {
      committed: true,
      block: chain.addBlock(verifiedTXs),
      acks: acks + 1,
      required
    };
  }
  return { committed: false, acks: acks + 1, required };
}

module.exports = { proposeBlock, majorityRequired };