# Demo Script for Faculty Review

## 8–10 minute flow

### 1. EV request
Enter battery, energy, latitude and longitude. Click Save EV Request.

Say:
"The system accepts an EV charging request instead of using fixed values."

### 2. Network map
Click Load Mapped Charging Stations. Click a marker and select it.

Say:
"We use OpenStreetMap-mapped charging locations to provide geographic context. Availability is not assumed to be live."

### 3. Planning
Click Plan Charging.

Say:
"The system calculates the EV-to-station distance and estimates congestion using a prototype queue model. If the station is busy, it recommends cooperation."

### 4. MCS
Click Dispatch Best MCS.

Say:
"The system filters mobile charging stations by distance, cost, status and available energy, then dispatches a suitable MCS."

### 5. Blockchain
Click Create + Verify + Commit Transaction.

Say:
"The charging report is signed, checked by the verifier group, and committed when the 2/3 verification threshold is reached."

Show the Traffic Blockchain.

### 6. Security
Click Simulate Malicious Round 3–4 times.

Say:
"A dishonest verifier loses trust and can be excluded below the threshold."

### 7. Contribution/rewards
Use the existing cooperation action in the dashboard if added to the preferred UI, or run the reward demo through the project API.

Say:
"Contribution factors are recorded and the reward pool is distributed proportionally."

### 8. Research results
Show Research Analytics.

Say:
"We evaluate waiting time as MCS capacity changes and trust decay under malicious behavior. These are prototype/synthetic experiments and will be replaced or extended with the final research dataset and repeated runs."

## Important
Do not claim that map availability, charging-slot occupancy, or pricing is live unless a live provider/API is explicitly connected.
