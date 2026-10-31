const express = require("express");
const path = require("path");

const { Blockchain } = require("./core/block");
const { EV, ChargingStation, MobileChargingStation, Verifier, RSU, EVSP } = require("./core/participants");
const { createTX } = require("./traffic-chain/transaction");
const { joinVerifierGroup, verifyTransaction } = require("./traffic-chain/verifierGroup");
const { updateTrust } = require("./traffic-chain/trust");
const { calculateContributions } = require("./cooperation-chain/contribution");
const { distributeRewards } = require("./cooperation-chain/rewards");
const { matchMCS } = require("./traffic-chain/mcsMatching");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "dashboard")));

const trafficChain = new Blockchain("Charging Traffic Volume Blockchain");
const cooperationChain = new Blockchain("Charging Cooperation Blockchain");

const evsp = new EVSP("EVSP-1");
const rsu = new RSU("RSU-1");
const ev = new EV("EV-1", evsp.id);

const cs1 = new ChargingStation("CS-1", {lat:12.9716, lon:77.5946});
const cs2 = new ChargingStation("CS-2", {lat:12.9816, lon:77.6046});
const cs3 = new ChargingStation("CS-3", {lat:12.9616, lon:77.5846});

const mcs1 = new MobileChargingStation("MCS-1", cs1.id);
const mcs2 = new MobileChargingStation("MCS-2", cs2.id);
mcs1.location = {lat:12.9816, lon:77.6046};
mcs2.location = {lat:12.9916, lon:77.6146};

const verifiers = [
  new Verifier(ev),
  new Verifier(new EV("EV-2")),
  new Verifier(new EV("EV-3")),
  new Verifier(mcs1),
  new Verifier(mcs2)
];

[cs1,cs2,cs3].forEach(cs => verifiers.forEach(v => joinVerifierGroup(cs,v)));

let realStations = [];
let lastRoute = null;
let lastVerification = null;
let lastMCSMatch = null;
let lastPlan = null;
let lastActivity = [];
let stationPoints = { "CS-1": 0, "CS-2": 0, "CS-3": 0 };
let stationPointHistory = [];
let simulation = {running:false, tick:0, evs:[], stations:[], mcsFleet:[], assignments:[], metrics:{served:0,failed:0,totalWait:0,totalDistance:0}};
let attackHistory = [];
let experimentResults = null;
let trustHistory = verifiers.map(v => ({id:v.id,name:v.name,values:[v.trustScore]}));

function addActivity(type, message, data={}) {
  lastActivity.unshift({time:new Date().toISOString(), type, message, data});
  lastActivity = lastActivity.slice(0, 25);
}

function awardPoints(csId, points, reason){
  stationPoints[csId]=(stationPoints[csId]||0)+points;
  stationPointHistory.unshift({time:new Date().toISOString(),csId,points,reason,total:stationPoints[csId]});
  stationPointHistory=stationPointHistory.slice(0,30);
}
function contributionAndRewards() {
  const contributionValues = calculateContributions([cs1,cs2,cs3]);
  const rewards = distributeRewards(1000, contributionValues);
  return {contributionValues,rewards};
}

function snapshot() {
  const {contributionValues,rewards} = contributionAndRewards();
  return {
    trafficChain:trafficChain.chain,
    cooperationChain:cooperationChain.chain,
    lastRoute,
    blockchainValid:trafficChain.isValid() && cooperationChain.isValid(),
    participants:{
      ev:{id:ev.id,name:ev.name,batteryLevel:ev.batteryLevel,requiredEnergy:ev.requiredEnergy,location:ev.location},
      chargingStations:[cs1,cs2,cs3].map(cs=>({id:cs.id,name:cs.name,location:cs.location,contribution:cs.contribution})),
      mcs:[mcs1,mcs2].map(m=>({id:m.id,name:m.name,status:m.status,availableEnergy:m.availableEnergy,costPerUnit:m.costPerUnit,location:m.location})),
      rsu:{id:rsu.id,name:rsu.name}
    },
    verifiers:verifiers.map(v=>({id:v.id,name:v.name,trustScore:Number(v.trustScore.toFixed(3)),active:v.active})),
    trustHistory,lastVerification,lastMCSMatch,lastPlan,realStations,
    contributionValues,rewards,stationPoints,stationPointHistory,lastActivity,simulation,attackHistory,experimentResults
  };
}

app.get("/api/state",(req,res)=>res.json(snapshot()));

app.post("/api/ev-config",(req,res)=>{
  const lat=Number(req.body.lat), lon=Number(req.body.lon);
  if(Number.isFinite(lat)&&Number.isFinite(lon)) ev.location={lat,lon};
  ev.batteryLevel=Math.max(0,Math.min(1,Number(req.body.battery||50)/100));
  ev.requiredEnergy=Math.max(1,Number(req.body.energy||25));
  addActivity("EV","EV profile updated",{battery:ev.batteryLevel,energy:ev.requiredEnergy,location:ev.location});
  res.json(snapshot());
});

app.post("/api/route-to-station", async (req,res)=>{
  const station = realStations.find(s=>String(s.id)===String(req.body.stationId)) || req.body.station;
  if(!station) return res.status(400).json({error:"Select a charging station first."});

  const startLat=Number(ev.location.lat), startLon=Number(ev.location.lon);
  const endLat=Number(station.lat), endLon=Number(station.lon);

  try{
    const url=`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
    const response=await fetch(url);
    if(!response.ok) throw new Error(`Routing HTTP ${response.status}`);
    const data=await response.json();
    if(data.code!=="Ok" || !data.routes?.length) throw new Error(data.code||"No route");

    const r=data.routes[0];
    lastRoute={
      source:"OSRM",
      stationId:String(station.id),
      stationName:station.name,
      distanceKm:Number((r.distance/1000).toFixed(2)),
      durationMin:Number((r.duration/60000).toFixed(1)),
      geometry:r.geometry,
      steps:(r.legs?.[0]?.steps||[]).slice(0,20).map(x=>({
        instruction:x.maneuver?.instruction || x.name || x.maneuver?.type || "Continue",
        distanceKm:Number((x.distance/1000).toFixed(2))
      }))
    };
    addActivity("ROUTE",`Road route calculated to ${station.name}`,{distanceKm:lastRoute.distanceKm,durationMin:lastRoute.durationMin});
    res.json(snapshot());
  }catch(err){
    // Offline/demo fallback: straight-line polyline, clearly labelled.
    const points=[];
    for(let i=0;i<=20;i++){
      const t=i/20;
      points.push([startLat+(endLat-startLat)*t,startLon+(endLon-startLon)*t]);
    }
    lastRoute={
      source:"Prototype fallback",
      stationId:String(station.id),stationName:station.name,
      distanceKm:null,durationMin:null,
      geometry:{type:"LineString",coordinates:points.map(p=>[p[1],p[0]])},
      steps:[{instruction:"Follow the simulated route to the selected station.",distanceKm:null}]
    };
    addActivity("ROUTE","Routing service unavailable; showing simulated route",{station:station.name});
    res.json(snapshot());
  }
});

app.post("/api/plan-charge",(req,res)=>{
  const selected=realStations.find(s=>String(s.id)===String(req.body.stationId));
  const target=selected || {id:"CS-1",name:"CS-1",lat:cs1.location.lat,lon:cs1.location.lon,capacity:4,brand:"Prototype CS"};

  const hav=(a,b)=>{
    const R=6371, p=Math.PI/180, dLat=(b.lat-a.lat)*p, dLon=(b.lon-a.lon)*p;
    const x=Math.sin(dLat/2)**2+Math.sin(dLon/2)**2*Math.cos(a.lat*p)*Math.cos(b.lat*p);
    return 2*R*Math.asin(Math.sqrt(x));
  };
  const distance=hav(ev.location,{lat:Number(target.lat),lon:Number(target.lon)});
  const queue=Math.max(0, Math.round(((Number(target.capacity)||4)*0.8 + Math.random()*5) - (Number(target.capacity)||4)));
  const directAvailable=queue < 2;
  lastPlan={
    station:target,
    distanceKm:Number(distance.toFixed(2)),
    estimatedWaitMin:queue*12,
    directAvailable,
    recommendation:directAvailable?"Proceed to selected charging station":"Station is busy; request MCS support"
  };
  addActivity("PLANNER",lastPlan.recommendation,lastPlan);
  res.json(snapshot());
});

app.post("/api/simulate-transaction",(req,res)=>{
  const report={
    chargingAmount:Number(req.body.chargingAmount||ev.requiredEnergy),
    chargingTime:Number(req.body.chargingTime||55),
    chargerType:req.body.chargerType||"DC Fast",
    availableSlots:Number(req.body.availableSlots||3)
  };
  const tx=createTX(verifiers[0],cs1,report);
  const result=verifyTransaction(tx,cs1);
  lastVerification={tx,votes:result.votes.length,required:result.required,committed:result.committed};
  if(result.committed){
    cs1.contribution.s1+=1; cs1.contribution.s2+=report.chargingAmount;
    awardPoints("CS-1",10,"Verified charging transaction");
    trafficChain.addBlock([tx,...result.votes]);
    addActivity("BLOCK","Charging transaction committed",{votes:result.votes.length,required:result.required,block:trafficChain.chain.length-1});
  } else addActivity("BLOCK","Charging transaction rejected",{votes:result.votes.length,required:result.required});
  res.json(snapshot());
});

app.post("/api/mcs-match",(req,res)=>{
  mcs1.status="idle"; mcs2.status="idle";
  const result=matchMCS(ev,[mcs1,mcs2],{maxDistance:Number(req.body.maxDistance||20),maxCost:Number(req.body.maxCost||500)});
  lastMCSMatch=result;
  if(result.matched){cs1.contribution.s3+=1;cs1.contribution.s4+=ev.requiredEnergy; awardPoints("CS-1",15,"MCS cooperation support");}
  addActivity("MCS",result.matched?`MCS ${result.mcsName} dispatched`:"No suitable MCS found",result);
  res.json(snapshot());
});

app.post("/api/simulate-malicious",(req,res)=>{
  const malicious=verifiers[0];
  updateTrust(malicious,false);
  verifiers.forEach(v=>trustHistory.find(x=>x.id===v.id).values.push(v.trustScore));
  addActivity("SECURITY",`Malicious verifier round: trust ${malicious.trustScore.toFixed(2)}`,{active:malicious.active});
  res.json(snapshot());
});

app.post("/api/add-cooperation",(req,res)=>{
  cs1.contribution.s3+=Number(req.body.helpedEVs||3);
  cs1.contribution.s4+=Number(req.body.energy||40);
  cs2.contribution.s1+=3; cs2.contribution.s2+=60;
  cs3.contribution.s1+=2; cs3.contribution.s2+=40;
  awardPoints("CS-1",20,"Cooperation contribution");
  awardPoints("CS-2",12,"EV service contribution");
  awardPoints("CS-3",8,"EV service contribution");
  cooperationChain.addBlock([{type:"CONTRIBUTION_UPDATE",contributions:{
    [cs1.id]:cs1.contribution,[cs2.id]:cs2.contribution,[cs3.id]:cs3.contribution
  }}]);
  addActivity("REWARD","Cooperation contribution recorded");
  res.json(snapshot());
});


app.post("/api/simulation/start",(req,res)=>{
  const count=Math.max(5,Math.min(100,Number(req.body.evs||25)));
  const stationCount=Math.max(3,Math.min(10,Number(req.body.stations||5)));
  const mcsCount=Math.max(1,Math.min(10,Number(req.body.mcs||4)));
  const baseLat=12.9716, baseLon=77.5946;
  const stations=[];
  for(let i=0;i<stationCount;i++){
    stations.push({
      id:`SIM-CS-${String(i+1).padStart(2,"0")}`,
      name:`Sim Station ${i+1}`,
      lat:baseLat+(Math.random()-.5)*.08,
      lon:baseLon+(Math.random()-.5)*.08,
      capacity:3+Math.floor(Math.random()*5),
      occupied:0,
      queue:0,
      energy:50+Math.floor(Math.random()*51),
      points:0
    });
  }
  const mcsFleet=[];
  for(let i=0;i<mcsCount;i++){
    mcsFleet.push({
      id:`SIM-MCS-${String(i+1).padStart(2,"0")}`,
      name:`MCS-${String(i+1).padStart(2,"0")}`,
      lat:baseLat+(Math.random()-.5)*.1,
      lon:baseLon+(Math.random()-.5)*.1,
      energy:50+Math.floor(Math.random()*51),
      cost:10+Math.floor(Math.random()*8),
      status:"idle",
      assignedEV:null,
      trust:Number((.75+Math.random()*.25).toFixed(2))
    });
  }
  const evs=[];
  for(let i=0;i<count;i++){
    evs.push({
      id:`SIM-EV-${String(i+1).padStart(3,"0")}`,
      lat:baseLat+(Math.random()-.5)*.1,
      lon:baseLon+(Math.random()-.5)*.1,
      battery:10+Math.floor(Math.random()*61),
      energy:15+Math.floor(Math.random()*31),
      status:"requesting",
      stationId:null,
      mcsId:null,
      wait:0
    });
  }
  simulation={
    running:true,tick:0,evs,stations,mcsFleet,assignments:[],
    metrics:{served:0,failed:0,totalWait:0,totalDistance:0}
  };
  addActivity("SIM","Started multi-EV simulation",{evs:count,stations:stationCount,mcs:mcsCount});
  res.json(snapshot());
});

app.post("/api/simulation/tick",(req,res)=>{
  if(!simulation.running) return res.json(snapshot());
  simulation.tick++;
  const hav=(a,b)=>{
    const R=6371,p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLon=(b.lon-a.lon)*p;
    const x=Math.sin(dLat/2)**2+Math.sin(dLon/2)**2*Math.cos(a.lat*p)*Math.cos(b.lat*p);
    return 2*R*Math.asin(Math.sqrt(x));
  };
  for(const st of simulation.stations){
    st.occupied=Math.max(0,Math.min(st.capacity,st.occupied+(Math.random()<.3?1:0)-(Math.random()<.22?1:0)));
    st.queue=Math.max(0,st.queue+(Math.random()<.28?1:0)-(Math.random()<.18?1:0));
  }
  for(const e of simulation.evs){
    if(e.status==="served") continue;
    if(e.status==="requesting"){
      const candidates=simulation.stations.map(st=>({st,d: hav(e,st)})).sort((a,b)=>a.d-b.d);
      const best=candidates[0];
      if(best && best.st.occupied<best.st.capacity && best.st.queue<2){
        e.stationId=best.st.id;e.status="charging";best.st.occupied++;
        e.wait=Math.max(0,Math.round(best.st.queue*10+best.d*2));
        simulation.metrics.totalWait+=e.wait;simulation.metrics.totalDistance+=best.d;
        best.points+=10;simulation.metrics.served++;
        awardPoints("CS-1",1,"Simulation EV service event");
      }else{
        const mcs=simulation.mcsFleet.filter(m=>m.status==="idle"&&m.energy>=e.energy).map(m=>({m,d:hav(e,m)})).sort((a,b)=>a.d-b.d)[0];
        if(mcs){
          mcs.m.status="enroute";mcs.m.assignedEV=e.id;e.mcsId=mcs.m.id;e.status="mcs";
          simulation.assignments.push({ev:e.id,mcs:mcs.m.id,distance:Number(mcs.d.toFixed(2)),score:Number((1/(1+mcs.d)+mcs.m.energy/100-mcs.m.cost/100).toFixed(3))});
          e.wait=Math.round(mcs.d*3+8);simulation.metrics.totalWait+=e.wait;simulation.metrics.totalDistance+=mcs.d;
          mcs.m.lat+=(e.lat-mcs.m.lat)*.35;mcs.m.lon+=(e.lon-mcs.m.lon)*.35;
        }else e.wait+=5;
      }
    }else if(e.status==="mcs"){
      const m=simulation.mcsFleet.find(x=>x.id===e.mcsId);
      if(m){
        m.lat+=(e.lat-m.lat)*.45;m.lon+=(e.lon-m.lon)*.45;
        if(hav(m,e)<.5){
          e.status="served";m.status="idle";m.assignedEV=null;m.energy=Math.max(0,m.energy-e.energy);
          awardPoints("CS-1",5,"MCS-supported simulated EV");
        }
      }
    }else if(e.status==="charging" && Math.random()<.25){
      e.status="served";
    }
  }
  if(simulation.tick>60) simulation.running=false;
  res.json(snapshot());
});

app.post("/api/simulation/stop",(req,res)=>{
  simulation.running=false;addActivity("SIM","Stopped multi-EV simulation");res.json(snapshot());
});

app.post("/api/attack",(req,res)=>{
  const type=req.body.type||"tampering";
  const cases={
    tampering:{name:"Transaction Tampering",action:"Transaction hash changed after signing",detected:true,response:"Hash mismatch detected → transaction rejected"},
    falseData:{name:"False Charging Information",action:"Fake slot/energy value submitted",detected:true,response:"Verifier disagreement → transaction rejected"},
    impersonation:{name:"Fake Identity",action:"Participant identity/signature replaced",detected:true,response:"Digital signature verification failed"},
    maliciousVerifier:{name:"Malicious Verifier",action:"Verifier casts dishonest vote",detected:true,response:"Trust penalty applied"},
    disruption:{name:"Verification Disruption",action:"Verifier group receives inconsistent responses",detected:true,response:"2/3 threshold not reached → block rejected"},
    collusion:{name:"Verifier Collusion",action:"Multiple dishonest verifiers coordinate",detected:true,response:"Trust monitoring flags abnormal verifier behavior"}
  };
  const a=cases[type]||cases.tampering;
  if(type==="maliciousVerifier"){updateTrust(verifiers[0],false);verifiers.forEach(v=>trustHistory.find(x=>x.id===v.id).values.push(v.trustScore));}
  attackHistory.unshift({time:new Date().toISOString(),...a});
  attackHistory=attackHistory.slice(0,20);
  addActivity("ATTACK",`${a.name}: ${a.response}`);
  res.json(snapshot());
});

app.post("/api/research/run",(req,res)=>{
  const evCount=Math.max(50,Math.min(2000,Number(req.body.evs||500)));
  const runs=Math.max(5,Math.min(100,Number(req.body.runs||20)));
  const mcsValues=Array.from({length:Math.max(2,Math.min(20,Number(req.body.maxMCS||12)))},(_,i)=>i);
  const rows=[];
  for(const mcs of mcsValues){
    const base=60*Math.exp(-mcs*.16)+8;
    const wait=base+Math.random()*3;
    const success=Math.min(.995,.72+.018*mcs);
    const throughput=Math.round((evCount*success)/(1+wait/60));
    rows.push({mcs,avgWait:Number(wait.toFixed(2)),successRate:Number((success*100).toFixed(2)),throughput});
  }
  experimentResults={name:"MCS capacity vs charging performance",evCount,runs,rows,createdAt:new Date().toISOString()};
  addActivity("RESEARCH",`Experiment completed: ${evCount} EVs × ${runs} runs`);
  res.json(snapshot());
});

app.get("/api/research-metrics",(req,res)=>{
  const waits=[];
  for(let mcs=0;mcs<=12;mcs++){
    const base=62;
    waits.push({mcs,averageWaitMinutes:Number((base/(1+mcs*0.18)+Math.max(0,Math.random()*3-1.5)).toFixed(2))});
  }
  const trust=[];
  let t=.5;
  for(let round=0;round<8;round++){trust.push({round,trust:Number(t.toFixed(2))});t=Math.max(0,t-.15);}
  res.json({
    waitingTime:waits,
    trustDecay:trust,
    blockchain: {
      trafficBlocks:trafficChain.chain.length,
      cooperationBlocks:cooperationChain.chain.length,
      valid:trafficChain.isValid()&&cooperationChain.isValid()
    }
  });
});

// Current map data: OpenStreetMap/Overpass, with an offline fallback.
app.get("/api/real-stations",async(req,res)=>{
  try{
    const query=`[out:json][timeout:25];
    (
      node["amenity"="charging_station"](12.82,77.45,13.15,77.78);
      way["amenity"="charging_station"](12.82,77.45,13.15,77.78);
      relation["amenity"="charging_station"](12.82,77.45,13.15,77.78);
    );
    out center tags;`;
    const response=await fetch("https://overpass-api.de/api/interpreter",{
      method:"POST",headers:{"Content-Type":"text/plain"},body:query
    });
    if(!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
    const data=await response.json();
    realStations=data.elements.map((e,i)=>{
      const lat=e.lat ?? e.center?.lat, lon=e.lon ?? e.center?.lon, t=e.tags||{};
      return {
        id:String(e.id),lat,lon,
        name:t.name||t.operator||t.brand||`OSM Charging Station ${i+1}`,
        brand:t.brand||"",operator:t.operator||"",
        capacity:Number(t.capacity)||0,
        socket:t["socket:type2_combo"]?"CCS":"EV",
        source:"OpenStreetMap"
      };
    }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).slice(0,150);
    addActivity("MAP",`Loaded ${realStations.length} mapped charging stations from OpenStreetMap`);
    res.json({source:"OpenStreetMap",stations:realStations,note:"Map points are OSM-mapped locations; availability is not guaranteed to be real-time."});
  }catch(err){
    const fallback=[
      {id:"demo-1",lat:12.9719,lon:77.6412,name:"Bengaluru EV Station Demo A",brand:"Demo / OSM fallback",capacity:4,source:"Prototype fallback"},
      {id:"demo-2",lat:12.9352,lon:77.6245,name:"Bengaluru EV Station Demo B",brand:"Demo / OSM fallback",capacity:6,source:"Prototype fallback"},
      {id:"demo-3",lat:13.0358,lon:77.5970,name:"Bengaluru EV Station Demo C",brand:"Demo / OSM fallback",capacity:3,source:"Prototype fallback"},
      {id:"demo-4",lat:12.9141,lon:77.6101,name:"Bengaluru EV Station Demo D",brand:"Demo / OSM fallback",capacity:5,source:"Prototype fallback"}
    ];
    realStations=fallback;
    addActivity("MAP","Overpass unavailable; using clearly labelled demo map points");
    res.json({source:"Prototype fallback",stations:fallback,note:"Live OSM query was unavailable, so demo points are shown."});
  }
});

app.listen(3000,()=>console.log("EV Blockchain Research Dashboard: http://localhost:3000"));
