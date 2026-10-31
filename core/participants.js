const { generateKeypair, sha256 } = require("./crypto");

class Participant {
  constructor(role, name) {
    const keys = generateKeypair();
    this.role = role;
    this.name = name;
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
    this.id = sha256(this.publicKey).slice(0, 16);
  }
}

class EV extends Participant {
  constructor(name, evsp = "EVSP-1") {
    super("EV", name);
    this.evsp = evsp;
    this.batteryLevel = 1.0;
    this.requiredEnergy = 20;
    this.location = { lat: 12.9716, lon: 77.5946 };
  }
}

class ChargingStation extends Participant {
  constructor(name, location = { lat: 12.9716, lon: 77.5946 }) {
    super("CS", name);
    this.location = location;
    this.chargers = 4;
    this.verifierGroup = new Set();
    this.contribution = { s1: 0, s2: 0, s3: 0, s4: 0 };
  }
}

class MobileChargingStation extends Participant {
  constructor(name, ownerCS) {
    super("MCS", name);
    this.ownerCS = ownerCS;
    this.status = "idle";
    this.batteryKWh = 100;
    this.availableEnergy = 80;
    this.costPerUnit = 12;
    this.callFee = 50;
    this.location = { lat: 12.9816, lon: 77.6046 };
  }
}

class RSU extends Participant {
  constructor(name) {
    super("RSU", name);
    this.location = { lat: 12.975, lon: 77.600 };
  }
}

class EVSP extends Participant {
  constructor(name) {
    super("EVSP", name);
  }
}

class Verifier extends Participant {
  constructor(participant) {
    super("VERIFIER", `Verifier-${participant.name}`);
    this.participantId = participant.id;
    this.trustScore = 0.5;
    this.active = true;
  }
}

module.exports = {
  Participant, EV, ChargingStation, MobileChargingStation, RSU, EVSP, Verifier
};