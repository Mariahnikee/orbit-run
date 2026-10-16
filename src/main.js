import * as THREE from "three";
import "./style.css";
import { createCharacter, normalizeStyle } from "./character.js";
import { getPlayer, saveScore, getLeaderboard, signInUrl, onStartNgReturn } from "./startng.js";

const $ = (id) => document.getElementById(id);
const canvasHost = $("game-canvas");
const scoreEl = $("score");
const bestEl = $("best");
const rankEl = $("rank");
const messageEl = $("message");
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayCopy = $("overlay-copy");
const startButton = $("start");
const pauseButton = $("pause");
const overlayStart = $("overlay-start");
const arenaState = $("arena-state");
const playerLabel = $("player-label");
const signInButton = $("sign-in");
const saveStatus = $("save-status");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#080d23");
scene.fog = new THREE.Fog("#080d23", 16, 48);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
camera.position.set(0, 7.4, 11.5);
camera.lookAt(0, 0.4, -4);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
canvasHost.append(renderer.domElement);

scene.add(new THREE.HemisphereLight("#a8c5ff", "#17112e", 2.1));
const keyLight = new THREE.DirectionalLight("#dce9ff", 3.1);
keyLight.position.set(-4, 9, 5);
keyLight.castShadow = true;
scene.add(keyLight);
const cyanLight = new THREE.PointLight("#14dfff", 22, 18);
cyanLight.position.set(0, 4, -5);
scene.add(cyanLight);
const purpleLight = new THREE.PointLight("#7251ff", 20, 22);
purpleLight.position.set(5, 3, -9);
scene.add(purpleLight);

const standard = (color, roughness = 0.6, metalness = 0.2, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const floorMat = standard("#171d3d", 0.42, 0.65);
const edgeMat = standard("#1b3c71", 0.3, 0.6, { emissive: "#075b9c", emissiveIntensity: 0.65 });
const hazardMat = standard("#ff365f", 0.32, 0.25, { emissive: "#b90032", emissiveIntensity: 1.3 });
const orbMat = standard("#5af3ff", 0.2, 0.35, { emissive: "#00a9e8", emissiveIntensity: 2.2 });
const arena = new THREE.Group();
scene.add(arena);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 42), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -0.06, -10);
floor.receiveShadow = true;
arena.add(floor);
for (let x of [-5.45, 5.45]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 42), edgeMat);
  rail.position.set(x, 0.05, -10);
  arena.add(rail);
}
for (let z = 10; z > -31; z -= 2) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.025, 0.025), edgeMat);
  line.position.set(0, 0.01, z);
  arena.add(line);
}
for (let i = 0; i < 38; i++) {
  const star = new THREE.Mesh(new THREE.SphereGeometry(Math.random() * 0.025 + 0.01, 6, 6), standard("#7d9cff", 0.4, 0.2, { emissive: "#3e6cff", emissiveIntensity: 1.2 }));
  star.position.set((Math.random() - 0.5) * 45, Math.random() * 13 + 1, -Math.random() * 42);
  scene.add(star);
}
for (let i = 0; i < 12; i++) {
  const width = 0.5 + Math.random() * 1.1;
  const block = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5 + Math.random(), 0.5), standard(i % 2 ? "#20274b" : "#302454", 0.55, 0.4));
  block.position.set((Math.random() - 0.5) * 13, 0.3 + Math.random(), -Math.random() * 38);
  block.rotation.set(Math.random() * 0.5, Math.random() * 2, Math.random() * 0.4);
  scene.add(block);
}

let currentStyle = normalizeStyle({});
let character = createCharacter(currentStyle);
character.position.set(0, 0, 4);
scene.add(character);

const lanes = [-3.2, 0, 3.2];
let laneIndex = 1;
let state = "ready";
let score = 0;
let elapsed = 0;
let spawnClock = 0;
let speed = 8;
let objects = [];
let playerInfo = { player: null, signedIn: false, guest: false, connected: false };
let lastFrame = performance.now();
let best = Number(localStorage.getItem("orbit-run-best") || 0);
bestEl.textContent = String(best).padStart(3, "0");

function resize() {
  const width = Math.max(1, canvasHost.clientWidth);
  const height = Math.max(1, canvasHost.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener("resize", resize);
resize();

function clearObjects() {
  for (const item of objects) {
    scene.remove(item.mesh);
    item.mesh.geometry.dispose();
    if (Array.isArray(item.mesh.material)) item.mesh.material.forEach((m) => m.dispose());
    else item.mesh.material.dispose();
  }
  objects = [];
}

function spawnObject() {
  const isOrb = Math.random() > 0.36;
  const lane = Math.floor(Math.random() * lanes.length);
  let mesh;
  if (isOrb) {
    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), orbMat.clone());
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 20), edgeMat);
    mesh.add(ring);
    mesh.userData.ring = ring;
  } else {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), hazardMat.clone());
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
  }
  mesh.castShadow = true;
  mesh.position.set(lanes[lane], isOrb ? 0.85 : 0.52, -24);
  scene.add(mesh);
  objects.push({ mesh, lane, type: isOrb ? "orb" : "hazard", hit: false });
}

function setOverlay(title, copy, buttonText = "Play now") {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayStart.textContent = buttonText;
  overlay.classList.remove("hidden");
}
function hideOverlay() { overlay.classList.add("hidden"); }
function startRun() {
  clearObjects();
  laneIndex = 1;
  character.position.x = lanes[laneIndex];
  score = 0; elapsed = 0; spawnClock = 0; speed = 8;
  scoreEl.textContent = "000";
  state = "running";
  arenaState.textContent = "RUNNING";
  startButton.textContent = "New run ↗";
  pauseButton.disabled = false;
  pauseButton.textContent = "Pause";
  messageEl.textContent = "Run live. Collect cyan orbs and dodge the red hazards.";
  hideOverlay();
}
function pauseRun() {
  if (state === "running") {
    state = "paused";
    arenaState.textContent = "PAUSED";
    pauseButton.textContent = "Resume";
    setOverlay("Run paused", "Catch your breath. Your current run is waiting.", "Resume run");
  } else if (state === "paused") {
    state = "running";
    arenaState.textContent = "RUNNING";
    pauseButton.textContent = "Pause";
    hideOverlay();
  }
}
async function endRun() {
  state = "over";
  arenaState.textContent = "RUN OVER";
  pauseButton.disabled = true;
  const isNewBest = score > best;
  if (isNewBest) {
    best = score;
    localStorage.setItem("orbit-run-best", String(best));
    bestEl.textContent = String(best).padStart(3, "0");
  }
  messageEl.textContent = isNewBest ? "New personal best. Nice run!" : "Run over. One more try?";
  setOverlay("Run over", `You collected ${score} point${score === 1 ? "" : "s"}. ${isNewBest ? "That's your new personal best!" : `Your best is ${best}.`}`, "Run again");
  if (playerInfo.signedIn) {
    saveStatus.textContent = "Saving score to start.ng…";
    try {
      const saved = await saveScore(score);
      if (saved?.ok) {
        saveStatus.textContent = saved.result?.improved ? "New best saved to start.ng" : "Score checked by start.ng";
      } else {
        saveStatus.textContent = "Could not save score to start.ng";
      }
    } catch {
      saveStatus.textContent = "Score save unavailable right now";
    }
  } else {
    saveStatus.textContent = "Sign in to save scores to start.ng";
  }
  loadLeaderboard();
}
function move(direction) {
  if (state !== "running") return;
  laneIndex = THREE.MathUtils.clamp(laneIndex + direction, 0, lanes.length - 1);
}
function onKey(event) {
  if (["ArrowLeft", "ArrowRight", " ", "a", "A", "d", "D", "w", "W", "s", "S"].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.key === " " || event.key === "Escape") {
    if (state === "running" || state === "paused") pauseRun();
    else if (state === "ready" || state === "over") startRun();
  }
}
window.addEventListener("keydown", onKey);
$("left").addEventListener("click", () => move(-1));
$("right").addEventListener("click", () => move(1));
startButton.addEventListener("click", startRun);
overlayStart.addEventListener("click", () => {
  if (state === "paused") pauseRun();
  else startRun();
});
$("restart").addEventListener("click", startRun);
pauseButton.addEventListener("click", pauseRun);
signInButton.addEventListener("click", () => { location.href = signInUrl(); });

function applyPlayer(player, signedIn, guest) {
  if (!player) return;
  playerInfo.player = player;
  playerInfo.signedIn = signedIn;
  playerInfo.guest = guest;
  currentStyle = normalizeStyle(player.style || {});
  const oldPosition = character.position.clone();
  scene.remove(character);
  character.traverse((node) => {
    if (node.isMesh) {
      node.geometry.dispose();
      if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
      else node.material.dispose();
    }
  });
  character = createCharacter(currentStyle);
  character.position.copy(oldPosition);
  scene.add(character);
  playerLabel.textContent = signedIn ? `${player.name || "Player"}${player.account ? ` · @${player.account}` : ""}` : "Guest player";
  $("connection-dot").classList.toggle("connected", signedIn);
  signInButton.hidden = signedIn;
  messageEl.textContent = signedIn
    ? `Welcome, ${player.name || "player"}. Your start.ng character style is active.`
    : "Playing as a guest. Sign in to save scores to start.ng.";
}

async function connectPlayer() {
  const result = await getPlayer();
  playerInfo.connected = result.connected;
  if (result.player) {
    applyPlayer(result.player, result.signedIn, result.guest);
  } else {
    playerLabel.textContent = result.connected ? "Guest player" : "Local preview";
    $("connection-dot").classList.remove("connected");
    signInButton.hidden = false;
    // Local fallback is for development only. On start.ng, the real player/guest style replaces it.
    applyPlayer({ name: "Local Runner", style: {
      body: "male", primaryColor: "#48dff2", secondaryColor: "#252d63",
      skinColor: "#8d5524", hairColor: "#17120f", hair: "short", hat: "none", accessory: "backpack"
    }}, false, true);
    saveStatus.textContent = "Local best saved on this device";
  }
}
async function loadLeaderboard() {
  try {
    const reply = await getLeaderboard();
    const entries = reply?.entries || [];
    if (entries.length) rankEl.textContent = `#${entries[0].rank}`;
  } catch { /* leaderboard is optional */ }
}
onStartNgReturn(connectPlayer);

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  const active = state === "running";
  if (active) {
    elapsed += delta;
    spawnClock += delta;
    speed = Math.min(15, 8 + elapsed * 0.12);
    if (spawnClock > Math.max(0.48, 1.08 - elapsed * 0.006)) {
      spawnClock = 0;
      spawnObject();
    }
    character.position.x = THREE.MathUtils.damp(character.position.x, lanes[laneIndex], 12, delta);
    const parts = character.userData.animationParts;
    if (parts) {
      parts.leftArm.rotation.x = Math.sin(elapsed * 9) * 0.25;
      parts.rightArm.rotation.x = -Math.sin(elapsed * 9) * 0.25;
    }
    for (let i = objects.length - 1; i >= 0; i--) {
      const item = objects[i];
      item.mesh.position.z += speed * delta;
      item.mesh.rotation.y += delta * (item.type === "orb" ? 1.8 : 0.9);
      if (item.mesh.userData.ring) item.mesh.userData.ring.rotation.z -= delta * 1.2;
      const close = Math.abs(item.mesh.position.z - character.position.z) < 0.7;
      const aligned = Math.abs(item.mesh.position.x - character.position.x) < 0.9;
      if (close && aligned && !item.hit) {
        item.hit = true;
        if (item.type === "orb") {
          score += 10;
          scoreEl.textContent = String(score).padStart(3, "0");
          scene.remove(item.mesh);
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
          objects.splice(i, 1);
          continue;
        } else {
          endRun();
          break;
        }
      }
      if (item.mesh.position.z > 8) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        objects.splice(i, 1);
      }
    }
  }
  // Subtle idle motion keeps the scene alive while paused or on the title screen.
  cyanLight.intensity = 20 + Math.sin(now * 0.0015) * 4;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

connectPlayer();
loadLeaderboard();
