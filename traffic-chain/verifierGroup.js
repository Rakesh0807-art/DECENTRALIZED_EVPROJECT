const { verifyTX, createVTX } = require("./transaction");

function joinVerifierGroup(cs, participantVerifier) {
  if (!cs.verifierGroup) cs.verifierGroup = new Set();
  cs.verifierGroup.add(participantVerifier);
}

function verifyTransaction(tx, cs) {
  const votes = [];
  for (const verifier of cs.verifierGroup) {
    if (!verifier.active) continue;
    if (verifyTX(tx)) votes.push(createVTX(verifier, tx));
  }
  const required = Math.ceil((2 / 3) * cs.verifierGroup.size);
  return {
    committed: votes.length >= required,
    votes,
    required
  };
}

module.exports = { joinVerifierGroup, verifyTransaction };