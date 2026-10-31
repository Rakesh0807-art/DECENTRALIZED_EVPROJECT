const crypto = require("crypto");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

function sha256(message) {
  return crypto.createHash("sha256").update(String(message)).digest("hex");
}

function generateKeypair() {
  const key = ec.genKeyPair();
  return {
    privateKey: key.getPrivate("hex"),
    publicKey: key.getPublic("hex")
  };
}

function sign(privateKeyHex, message) {
  const key = ec.keyFromPrivate(privateKeyHex, "hex");
  return key.sign(sha256(message)).toDER("hex");
}

function verify(publicKeyHex, message, signatureHex) {
  try {
    const key = ec.keyFromPublic(publicKeyHex, "hex");
    return key.verify(sha256(message), signatureHex);
  } catch {
    return false;
  }
}

module.exports = { sha256, generateKeypair, sign, verify };