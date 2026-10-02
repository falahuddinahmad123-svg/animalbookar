"use strict";
const ui = Object.fromEntries(["ar-view", "mode", "status", "instruction", "audio-status", "animal-buttons", "start-ar", "preview", "asset-details", "asset-summary", "asset-list"].map(id => [id, document.getElementById(id)]));
const PREVIEW_MODE = new URLSearchParams(location.search).get("preview") === "1";
document.body.dataset.preview = String(PREVIEW_MODE);
const MINDAR_URL = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";
let THREE, GLTFLoader, previewRenderer, previewScene, previewCamera, content, clock, raycaster, pointer;
let mindar, anchor, pose, mode = "preview", tracking = false, poseReady = false, starting = false, pageClosed = false, arFailed = false;
const MAX_AUDIO_SECONDS = 15;
let activeAudio = null, audioToken = 0, audioTimer = null;
let activeId = null;
const entries = new Map();
const assetIssues = new Map();
const modelBuffers = new Map();
function modelData(path) {
  if (!modelBuffers.has(path)) {
    const promise = resource(path).then(response => response.arrayBuffer());
    modelBuffers.set(path, promise);
    promise.catch(() => modelBuffers.delete(path));
  }
  return modelBuffers.get(path);
}
async function prefetchModels() {
  // Fetch one at a time without parsing hidden models or blocking camera startup.
  for (const animal of BOOK_CONFIG.animals) {
    if (pageClosed) return;
    try { await modelData(animal.model); } catch (error) { console.warn("Model prefetch deferred", animal.id, error); }
  }
}
// Reuse the permission stream instead of opening the physical camera a second time.
function attachCamera(instance, stream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video"); instance.video = video;
    video.autoplay = true; video.muted = true; video.playsInline = true;
    Object.assign(video.style, { position: "absolute", top: "0", left: "0", zIndex: "-2" });
    ui["ar-view"].append(video);
    video.onloadedmetadata = () => {
      video.width = video.videoWidth; video.height = video.videoHeight;
      video.play().then(resolve, reject);
    };
    video.onerror = () => reject(new Error("Video kamera gagal dimuat."));
    video.srcObject = stream;
  });
}

function status(message) { ui.status.textContent = message; }
function issue(path, message, error) {
  assetIssues.set(path, message);
  ui["asset-details"].hidden = false;
  ui["asset-list"].replaceChildren();
  for (const [file, text] of assetIssues) {
    const li = document.createElement("li"); li.textContent = `${text} — ${file}`; ui["asset-list"].append(li);
  }
  ui["asset-summary"].textContent = `Aset perlu diperiksa (${assetIssues.size})`;
  console.warn("[Animal Books AR]", message, path, error || "");
}
async function resource(path, method = "GET") {
  const response = await fetch(path, { method, signal: AbortSignal.timeout(60000) });
  if (!response.ok || (response.headers.get("content-type") || "").includes("text/html")) throw new Error(`HTTP ${response.status}: ${path}`);
  return response;
}
function timeout(promise, ms, description) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(description)), ms); })]).finally(() => clearTimeout(timer));
}
function validateConfig() {
  const ids = new Set();
  if (!BOOK_CONFIG.animals.length) throw new Error("Isi daftar animals di config.js.");
  for (const animal of BOOK_CONFIG.animals) {
    if (!animal.id || ids.has(animal.id) || !animal.model || !animal.sound || !(animal.height > 0) || animal.position.length !== 3) throw new Error("Konfigurasi hewan tidak valid atau ID duplikat.");
    if (animal.targetIndex !== ids.size || !animal.marker) throw new Error("Urutan target tidak valid. Compile ulang semua marker.");
    ids.add(animal.id);
  }
}

// Optional development preview. Animal groups stay empty until the GLB is ready.
function setupPreview() {
  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x14263d);
  previewCamera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  previewCamera.position.set(0, 0.16, 2);
  previewRenderer = new THREE.WebGLRenderer({ antialias: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ui["ar-view"].append(previewRenderer.domElement);
  addLights(previewScene);
  content = new THREE.Group(); previewScene.add(content);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65), new THREE.MeshBasicMaterial({ color: 0x263f5c }));
  page.position.set(0, 0.25, -0.04); previewScene.add(page);
  clock = new THREE.Clock(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  pose = { position: new THREE.Vector3(), rotation: new THREE.Quaternion(), scale: new THREE.Vector3(), parent: new THREE.Quaternion(), camera: new THREE.Quaternion() };
  resizePreview(); window.addEventListener("resize", resizePreview);
  previewRenderer.setAnimationLoop(renderPreview);
}
function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7189a2, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 2, 3); scene.add(light);
}
function resizePreview() {
  const width = ui["ar-view"].clientWidth, height = ui["ar-view"].clientHeight;
  previewRenderer.setSize(width, height);
  previewCamera.aspect = width / height;
  previewCamera.position.z = Math.max(1.9, 0.7 / Math.tan(Math.PI / 8) / previewCamera.aspect);
  previewCamera.updateProjectionMatrix();
}
function createAnimal(config) {
  const group = new THREE.Group(); group.userData.animalId = config.id; group.position.fromArray(config.position);
  const visual = new THREE.Group(); group.add(visual);
  group.visible = false; content.add(group);
  const button = document.createElement("button"); button.textContent = config.name; button.type = "button"; button.addEventListener("click", () => selectPreview(config.id)); ui["animal-buttons"].append(button);
  const entry = { config, group, visual, button, placeholder: true, mixer: null, correction: new THREE.Quaternion().setFromEuler(new THREE.Euler(...config.rotation)) };
  entries.set(config.id, entry); return entry;
}
function loadAnimal(entry) {
  if (!entry.placeholder) return Promise.resolve();
  if (!entry.loading) entry.loading = loadAnimalModel(entry).finally(() => { entry.loading = null; });
  return entry.loading;
}
async function loadAnimalModel(entry) {
  try {
    const data = await modelData(entry.config.model);
    const model = await timeout(new GLTFLoader().parseAsync(data, new URL(".", new URL(entry.config.model, location.href)).href), 60000, "Model gagal diproses.");
    const box = new THREE.Box3().setFromObject(model.scene);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    if (box.isEmpty() || size.y < 0.00001) throw new Error("Model tidak memiliki tinggi yang valid.");
    const normalized = new THREE.Group(); normalized.add(model.scene);
    model.scene.position.x -= center.x; model.scene.position.y -= box.min.y; model.scene.position.z -= center.z;
    normalized.scale.setScalar(Math.min(entry.config.height / size.y, 0.85 / Math.max(size.x, size.z)));
    const materials = new Set();
    entry.visual.traverse(object => { object.geometry?.dispose(); if (object.material) materials.add(object.material); });
    for (const material of materials) material.dispose();
    entry.visual.clear(); entry.visual.add(normalized); entry.placeholder = false;
    modelBuffers.delete(entry.config.model);
    if (activeId === entry.config.id && (mode !== "ar" || tracking)) status(`${entry.config.name} terdeteksi`);
    if (model.animations.length) {
      entry.mixer = new THREE.AnimationMixer(model.scene);
      const clip = model.animations.find(item => item.name.toLowerCase() === "idle") || model.animations[0];
      entry.mixer.clipAction(clip).play();
    }
  } catch (error) { issue(entry.config.model, `Model ${entry.config.name} belum tersedia/valid. Silakan muat ulang untuk mencoba lagi.`, error); }
}
function animateAnimals(delta, camera) {
  content.updateWorldMatrix(true, false); content.getWorldQuaternion(pose.parent); camera.getWorldQuaternion(pose.camera);
  for (const entry of entries.values()) {
    if (!entry.group.visible) continue;
    if (mode === "preview") entry.visual.quaternion.identity();
    else if (entry.config.faceCamera) entry.visual.quaternion.copy(pose.parent).invert().multiply(pose.camera).multiply(entry.correction);
    else entry.visual.quaternion.copy(entry.correction);
    entry.mixer?.update(delta);
  }
}
function renderPreview() {
  if (mode !== "preview" || pageClosed) return;
  animateAnimals(Math.min(clock.getDelta(), 0.1), previewCamera);
  previewRenderer.render(previewScene, previewCamera);
}

// AUDIO: only user gestures play sound. One sound at a time; no external links.
function stopSound(clear = true) {
  audioToken++;
  if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null; }
  clearTimeout(audioTimer); audioTimer = null;
  if (clear) ui["audio-status"].textContent = "";
}
function playAnimal(id) {
  const entry = entries.get(id);
  if (!entry || entry.placeholder || id !== activeId || !entry.group.visible || (mode === "ar" && !tracking) || starting) return;
  stopSound();
  const token = audioToken;
  const audio = new Audio(entry.config.sound); activeAudio = audio;
  ui["audio-status"].textContent = `Memuat suara ${entry.config.name}…`;
  audio.ontimeupdate = () => { if (token === audioToken && audio.currentTime >= MAX_AUDIO_SECONDS) stopSound(); };
  audio.onended = () => { if (token === audioToken) stopSound(); };
  // play() is invoked directly in the click/pointer event to satisfy mobile audio rules.
  const result = audio.play();
  timeout(result || Promise.resolve(), 20000, "Suara terlalu lama dimuat.").then(() => {
    if (token !== audioToken) return;
    ui["audio-status"].textContent = "";
    audioTimer = setTimeout(() => { if (token === audioToken) stopSound(); }, MAX_AUDIO_SECONDS * 1000);
  }).catch(error => {
    if (token !== audioToken) return;
    stopSound(false);
    ui["audio-status"].textContent = `Suara ${entry.config.name} belum bisa diputar. Periksa ${entry.config.sound}.`;
    issue(entry.config.sound, "Audio belum tersedia atau formatnya tidak didukung.", error);
  });
}

// MINDAR: eight page targets; one active page and animal at a time.
async function startAR() {
  if (arFailed) { location.reload(); return; }
  if (starting || mode === "ar") return;
  starting = true; ui["start-ar"].disabled = true; ui["start-ar"].hidden = true; stopSound();
  let cameraStream;
  try {
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Kamera membutuhkan HTTPS atau localhost dan browser yang mendukung kamera.");
    try { await resource(BOOK_CONFIG.target, "HEAD"); }
    catch (error) {
      issue(BOOK_CONFIG.target, "Target halaman belum tersedia. Compile gambar melalui tools/compile.html.", error);
      throw new Error("Tambahkan gambar halaman dan hasil compile .mind sebelum memulai AR.");
    }
    status("Meminta izin kamera…");
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
    if (pageClosed) { cameraStream.getTracks().forEach(track => track.stop()); return; }
    if (!mindar) {
      const { MindARThree } = await timeout(import(MINDAR_URL), 30000, "CDN MindAR tidak dapat dimuat.");
      mindar = new MindARThree({ container: ui["ar-view"], imageTargetSrc: BOOK_CONFIG.target, maxTrack: 1, uiLoading: "no", uiScanning: "no", uiError: "no", ...BOOK_CONFIG.tracking });
      mindar.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      mindar.cssRenderer.domElement.style.pointerEvents = "none"; addLights(mindar.scene);
      for (const entry of entries.values()) {
        const target = mindar.addAnchor(entry.config.targetIndex);
        target.onTargetFound = () => {
          if (mode !== "ar") return;
          stopSound(); anchor = target; tracking = true; poseReady = false;
          activateAnimal(entry.config.id); updateButtons();
        };
        target.onTargetLost = () => {
          if (anchor !== target) return;
          tracking = false; poseReady = false; content.visible = false; stopSound();
          if (mode === "ar") status("Arahkan kamera ke halaman buku");
          updateButtons();
        };
      }
    }
    mode = "ar"; document.body.dataset.mode = "ar"; tracking = false; content.visible = false;
    previewRenderer.setAnimationLoop(null); previewRenderer.domElement.hidden = true;
    mindar.renderer.domElement.hidden = false; mindar.scene.add(content);
    status("Menyiapkan tracking…");
    mindar._startVideo = () => attachCamera(mindar, cameraStream);
    const cameraStart = mindar.start();
    cameraStart.then(() => { if (arFailed || pageClosed || mode !== "ar") stopCamera(); }, () => {});
    await timeout(cameraStart, 45000, "MindAR terlalu lama dimulai. Periksa file .mind lalu muat ulang halaman.");
    if (pageClosed || mode !== "ar") { stopCamera(); return; }
    mindar.video.muted = true; await mindar.video.play();
    ui.mode.textContent = "Mode AR"; ui.preview.hidden = !PREVIEW_MODE; ui["start-ar"].hidden = true;
    mindar.renderer.setAnimationLoop(renderAR);
    if (!tracking) status("Arahkan kamera ke halaman buku");
    void prefetchModels();
  } catch (error) {
    cameraStream?.getTracks().forEach(track => track.stop());
    arFailed = !!mindar;
    if (arFailed) ui["start-ar"].textContent = "Muat ulang untuk mencoba AR";
    usePreview();
    status(error?.name === "NotAllowedError" ? "Izinkan akses kamera di pengaturan browser, lalu coba lagi." : error?.message || "AR gagal dimulai. Periksa izin kamera dan target halaman.");
    console.error("[Animal Books AR]", error);
  } finally { starting = false; ui["start-ar"].disabled = false; updateButtons(); }
}
function renderAR() {
  const delta = Math.min(clock.getDelta(), 0.1);
  if (tracking && anchor?.group.visible) {
    anchor.group.updateWorldMatrix(true, false); anchor.group.matrixWorld.decompose(pose.position, pose.rotation, pose.scale);
    pose.rotation.normalize(); pose.scale.setScalar((pose.scale.x + pose.scale.y + pose.scale.z) / 3);
    if (!poseReady) { content.position.copy(pose.position); content.quaternion.copy(pose.rotation); content.scale.copy(pose.scale); poseReady = true; }
    else { const alpha = 1 - Math.exp(-BOOK_CONFIG.tracking.smoothingRate * delta); content.position.lerp(pose.position, alpha); content.quaternion.slerp(pose.rotation, alpha); content.scale.lerp(pose.scale, alpha); }
    content.visible = true; animateAnimals(delta, mindar.camera);
  } else content.visible = false;
  mindar.renderer.render(mindar.scene, mindar.camera);
}
function stopCamera() {
  mindar?.renderer.setAnimationLoop(null); mindar?.controller?.stopProcessVideo();
  mindar?.video?.srcObject?.getTracks().forEach(track => track.stop()); mindar?.video?.remove();
  if (mindar) mindar.renderer.domElement.hidden = true;
}
function usePreview() {
  mode = "preview"; document.body.dataset.mode = "preview"; tracking = false; poseReady = false;
  stopCamera(); stopSound();
  if (!previewRenderer) return;
  previewScene.add(content); content.position.set(0, 0.4, 0); content.quaternion.identity(); content.scale.setScalar(1); content.visible = true;
  previewRenderer.domElement.hidden = !PREVIEW_MODE; previewRenderer.setAnimationLoop(PREVIEW_MODE ? renderPreview : null);
  ui.mode.textContent = "Pratinjau • bukan tracking kamera"; ui.preview.hidden = true; ui["start-ar"].hidden = false;
  status("Ketuk hewan untuk mendengarkan suara."); updateButtons();
}
function updateButtons() {
  for (const entry of entries.values()) {
    entry.button.disabled = starting || mode === "ar";
    entry.button.setAttribute("aria-pressed", String(activeId === entry.config.id));
  }
}
function activateAnimal(id) {
  stopSound(); activeId = id;
  for (const entry of entries.values()) entry.group.visible = entry.config.id === id;
  const entry = entries.get(id);
  status(entry.placeholder ? `Memuat model ${entry.config.name}...` : `${entry.config.name} terdeteksi`);
  updateButtons(); return loadAnimal(entry);
}
async function selectPreview(id) {
  if (mode !== "preview" || starting || !entries.has(id)) return;
  await activateAnimal(id);
}
function hitAnimal(event) {
  if (starting || (mode === "ar" && !tracking)) return;
  const renderer = mode === "ar" ? mindar.renderer : previewRenderer, camera = mode === "ar" ? mindar.camera : previewCamera;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  content.updateWorldMatrix(true, true); raycaster.setFromCamera(pointer, camera);
  for (const hit of raycaster.intersectObject(entries.get(activeId)?.group || content, true)) {
    for (let node = hit.object; node && node !== content; node = node.parent) {
      if (node.userData.animalId) { playAnimal(node.userData.animalId); return; }
    }
  }
}
function setupEvents() {
  let down;
  ui["ar-view"].addEventListener("pointerdown", event => { if (event.isPrimary && event.button === 0) down = { id: event.pointerId, x: event.clientX, y: event.clientY }; });
  ui["ar-view"].addEventListener("pointerup", event => { if (down?.id === event.pointerId && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 12) hitAnimal(event); down = null; });
  ui["ar-view"].addEventListener("pointercancel", () => { down = null; });
  ui["start-ar"].addEventListener("click", startAR); ui.preview.addEventListener("click", usePreview);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopSound(); });
  window.addEventListener("pagehide", () => { pageClosed = true; stopCamera(); stopSound(); previewRenderer.setAnimationLoop(null); });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
}
async function init() {
  try {
    validateConfig();
    [THREE, { GLTFLoader }] = await timeout(Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js")]), 30000, "Library 3D gagal dimuat. Periksa koneksi internet lalu reload.");
    setupPreview(); setupEvents();
    BOOK_CONFIG.animals.forEach(createAnimal);
    usePreview(); ui["start-ar"].disabled = false;
    if (PREVIEW_MODE) await selectPreview(BOOK_CONFIG.animals[0].id);
    else await startAR();

  } catch (error) { status(error.message || "Aplikasi gagal dimuat. Coba browser lain yang mendukung WebGL."); console.error(error); }
}
window.addEventListener("unhandledrejection", event => { event.preventDefault(); console.error(event.reason); arFailed = true; ui["start-ar"].textContent = "Muat ulang untuk mencoba AR"; usePreview(); status("AR mengalami masalah. Periksa target halaman dan muat ulang untuk mencoba lagi."); });
init();
