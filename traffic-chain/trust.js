function clamp(x, min = 0, max = 1) {
  return Math.max(min, Math.min(max, x));
}

function updateTrust(verifier, wasHonestThisRound) {
  const delta = wasHonestThisRound ? 0.05 : -0.15;
  verifier.trustScore = clamp(verifier.trustScore + delta);
  if (verifier.trustScore < 0.45) verifier.active = false;
  return verifier.trustScore;
}

function resetVerifier(verifier, score = 0.5) {
  verifier.trustScore = score;
  verifier.active = true;
}

module.exports = { updateTrust, resetVerifier };