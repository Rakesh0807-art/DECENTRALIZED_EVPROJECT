const { EV, ChargingStation, MobileChargingStation, Verifier } = require("./core/participants");
const { Blockchain } = require("./core/block");
const { createTX } = require("./traffic-chain/transaction");
const { joinVerifierGroup, verifyTransaction } = require("./traffic-chain/verifierGroup");

const cs = new ChargingStation("Demo-CS");
const ev = new EV("Demo-EV");
const mcs = new MobileChargingStation("Demo-MCS", cs.id);

const group = [new Verifier(ev), new Verifier(new EV("EV-2")), new Verifier(new EV("EV-3"))];
group.forEach(v => joinVerifierGroup(cs, v));

const tx = createTX(group[0], cs, {
  chargingAmount: 25,
  chargingTime: 60,
  chargerType: "DC Fast",
  availableSlots: 2
});

const result = verifyTransaction(tx, cs);
const chain = new Blockchain("Demo Traffic Chain");

if (result.committed) chain.addBlock([tx, ...result.votes]);

console.log("Transaction created:", tx);
console.log("Votes:", result.votes.length, "/", result.required);
console.log("Committed:", result.committed);
console.log("Blockchain valid:", chain.isValid());