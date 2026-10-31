# Project Simplifications

This prototype is designed for a final-year project demonstration.

Compared with the paper, the following simplifications are intentionally made:

1. Hyperledger Fabric is replaced by a custom hash-linked blockchain.
2. RAFT is represented by a simplified majority-acknowledgement flow.
3. CTRUST is represented by an asymmetric trust update (+0.05 for honest, -0.15 for dishonest) with a 0.45 exclusion threshold.
4. The cooperation blockchain uses the four contribution factors s1-s4 and proportional rewards.
5. Simulation data are synthetic rather than the paper's original real-world datasets.
6. The dashboard is a plain HTML/CSS/JavaScript interface using Chart.js.
7. The Shapley Python module is included separately so its mathematical calculation can be demonstrated and tested independently.

These scope decisions should be explained during project presentation rather than claiming a 1:1 reproduction of the original production environment.
