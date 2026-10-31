const { sign, verify } = require("../core/crypto");

function createTX(verifier, cs, report) {
  const payload = {
    date: Date.now(),
    timestamp: Date.now(),
    csId: cs.id,
    verifierId: verifier.id,
    report
  };
  const signature = sign(verifier.privateKey, JSON.stringify(payload));
  return { ...payload, signature, publicKey: verifier.publicKey };
}

function verifyTX(tx) {
  const payload = {
    date: tx.date,
    timestamp: tx.timestamp,
    csId: tx.csId,
    verifierId: tx.verifierId,
    report: tx.report
  };
  return verify(tx.publicKey, JSON.stringify(payload), tx.signature);
}

function createVTX(verifier, tx) {
  const message = JSON.stringify({
    txHash: JSON.stringify(tx),
    verifierId: verifier.id
  });
  return {
    verifierId: verifier.id,
    signature: sign(verifier.privateKey, message),
    publicKey: verifier.publicKey
  };
}

module.exports = { createTX, verifyTX, createVTX };