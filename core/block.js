const { sha256 } = require("./crypto");

class Block {
  constructor(index, timestamp, transactions, previousHash = "0") {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.computeHash();
  }

  computeHash() {
    return sha256(
      this.index +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.previousHash
    );
  }
}

class Blockchain {
  constructor(name) {
    this.name = name;
    this.chain = [new Block(0, Date.now(), [], "0")];
  }

  latestHash() {
    return this.chain[this.chain.length - 1].hash;
  }

  addBlock(transactions) {
    const block = new Block(
      this.chain.length,
      Date.now(),
      transactions,
      this.latestHash()
    );
    this.chain.push(block);
    return block;
  }

  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (current.hash !== current.computeHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }
}

module.exports = { Block, Blockchain };