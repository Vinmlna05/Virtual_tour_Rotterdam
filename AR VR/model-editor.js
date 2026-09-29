/* =================================================================
   TEMPORARY MODEL EDITOR (STANDALONE FILE)
   Fungsi: mengatur posisi / scale / rotasi object 3D (GLB) per spot.

   KONSEP SAMA DENGAN navigation-editor.js:
   Semua hasil editing disimpan di dalam tourData (index.html), bukan di
   browser. Editor ini menulis LANGSUNG ke tourData dan menampilkannya lewat
   loadSpot(), jadi object yang Anda lihat = object asli di tur.

   Bedanya dengan navigation-editor.js:
   - Tidak perlu copy-paste manual ke tourData
   - Tersimpan permanen lewat tombol "Simpan index.html" (download file baru)

   Cara pakai:
   1. Klik Mode: OFF -> Mode: EDITING (ON)
   2. Pilih Spot Tujuan + Model
   3. Arahkan kursor, klik "Tentukan Titik di Kursor" atau klik panorama
   4. Atur scale / rotasi, klik "Ratakan & Pusatkan"
   5. Klik "Simpan index.html" -> replace file index.html yang asli

   SETELAH SEMUA KOORDINAT FINAL:
   1. Hapus file ini (model-editor.js)
   2. Hapus baris di index.html:
      <script src="model-editor.js"></script>
   ================================================================= */

(function () {
  // tourData adalah const di <script> inline index.html. Binding const/let
  // tingkat atas bersifat global bersama antar-script klasik, jadi bisa
  // dibaca DAN dimutasi di sini.
  if (typeof tourData === 'undefined') {
    console.error('[model-editor] tourData tidak ditemukan. Pastikan model-editor.js dimuat SETELAH script inline index.html.');
    return;
  }

  let isEditMode = false;
  let currentModelId = '#model2';
  let currentSpotId = null;
  let editingIndex = -1;      // index model di dalam tourData[spot].models
  let modelLoaded = false;
  let hasUnsavedChanges = false;

  const FLOOR_Y = -1.8; // Ketinggian lantai, sama dengan groundY di navigation-editor.js

  let objState = { x: 0, y: FLOOR_Y, z: -5, scale: 1, ry: 0, rx: 0 };
  let liveTargetState = { x: 0, y: FLOOR_Y, z: -5 };

  // ============ UTILITAS ============

  function getCurrentSpot() {
    const sky = document.querySelector('#main-sky');
    if (!sky) return null;
    const m = (sky.getAttribute('src') || '').match(/img-(nomor\d+)/);
    return m ? m[1] : null;
  }

  function getModelContainer() {
    return document.querySelector('#models-container');
  }

  // Entitas di #models-container dibangun berurutan oleh loadSpot(),
  // jadi urutan children = urutan array models.
  function getEntityByIndex(index) {
    const c = getModelContainer();
    return c ? c.children[index] : null;
  }

  function findModelIndex(spotId, modelId) {
    const s = tourData[spotId];
    if (!s || !s.models) return -1;
    for (let i = 0; i < s.models.length; i++) {
      if (s.models[i].modelId === modelId) return i;
    }
    return -1;
  }

  function parseTriplet(str) {
    const p = String(str || '0 0 0').trim().split(/\s+/).map(parseFloat);
    return { x: p[0] || 0, y: p[1] || 0, z: p[2] || 0 };
  }

  function fmt(n) { return parseFloat(n).toFixed(2); }

  // Ukur ukuran dunia (meter) dari mesh GLB yang sudah termuat
  function measure() {
    const el = getEntityByIndex(editingIndex);
    if (!el || typeof THREE === 'undefined') return null;
    const mesh = el.getObject3D('mesh');
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return null;
    return {
      minY: box.min.y,
      ctrX: (box.max.x + box.min.x) / 2,
      ctrZ: (box.max.z + box.min.z) / 2,
      sizeX: box.max.x - box.min.x,
      sizeY: box.max.y - box.min.y,
      sizeZ: box.max.z - box.min.z
    };
  }

  // Bounding box LOKAL model (meter asli, sebelum scale) - untuk menghitung offset
  function getLocalBBox() {
    const el = getEntityByIndex(editingIndex);
    if (!el || typeof THREE === 'undefined') return null;
    const mesh = el.getObject3D('mesh');
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return null;
    const s = parseFloat(el.getAttribute('scale').x) || 1;
    const p = el.getAttribute('position');
    return {
      min: { x: (box.min.x - p.x) / s, y: (box.min.y - p.y) / s, z: (box.min.z - p.z) / s },
      max: { x: (box.max.x - p.x) / s, y: (box.max.y - p.y) / s, z: (box.max.z - p.z) / s }
    };
  }

  // ============ SINKRON DENGAN tourData ============

  // Muat state editor dari tourData untuk (spot, model) yang dipilih.
  // Kalau model itu belum ada di tourData, siapkan entry baru di titik kursor.
  function syncFromTourData(lockToCursorIfNew) {
    const spotId = currentSpotId;
    if (!spotId || !tourData[spotId]) return;

    editingIndex = findModelIndex(spotId, currentModelId);
    modelLoaded = false;

    if (editingIndex >= 0) {
      // Model sudah ada di tur -> ambil datanya
      const m = tourData[spotId].models[editingIndex];
      const p = parseTriplet(m.position);
      const r = parseTriplet(m.rotation);
      objState.x = p.x; objState.y = p.y; objState.z = p.z;
      objState.rx = r.x || 0; objState.ry = r.y || 0;
      const sc = parseFloat(String(m.scale || '1').trim().split(/\s+/)[0]);
      objState.scale = isNaN(sc) ? 1 : sc;
      bindEntity();
    } else if (lockToCursorIfNew) {
      // Model baru -> buat entry di titik kursor saat ini
      objState.x = liveTargetState.x;
      objState.y = FLOOR_Y;
      objState.z = liveTargetState.z;
      ensureEntity();
      commitToTourData();
    }
    updateInfo();
  }

  // Pastikan entitas A-Frame untuk model yang sedang diedit ada di scene.
  function ensureEntity() {
    const spotId = currentSpotId;
    if (!spotId) return;

    if (editingIndex < 0) {
      // Tambah entry baru ke tourData dulu supaya index-nya ada
      if (!tourData[spotId].models) tourData[spotId].models = [];
      tourData[spotId].models.push({
        modelId: currentModelId,
        position: '0 -1.8 0',
        scale: '1 1 1',
        rotation: '0 0 0'
      });
      editingIndex = tourData[spotId].models.length - 1;
      modelLoaded = false;
    }

    let el = getEntityByIndex(editingIndex);
    if (!el) {
      const m = tourData[spotId].models[editingIndex];
      el = document.createElement('a-entity');
      getModelContainer().appendChild(el);
      el.setAttribute('gltf-model', m.modelId);
      el.addEventListener('model-loaded', () => {
        modelLoaded = true;
        updateInfo();
      });
    }
    applyState();
  }

  // Pasang listener model-loaded pada entitas yang sedang aktif
  function bindEntity() {
    const el = getEntityByIndex(editingIndex);
    if (!el) { ensureEntity(); return; }
    applyState();
    if (el.getObject3D && el.getObject3D('mesh')) {
      modelLoaded = true;
    } else {
      modelLoaded = false;
      el.addEventListener('model-loaded', () => {
        modelLoaded = true;
        updateInfo();
      });
    }
    updateInfo();
  }

  // Terapkan state ke entitas A-Frame
  function applyState() {
    const el = getEntityByIndex(editingIndex);
    if (!el) return;
    const s = objState.scale;
    el.setAttribute('position', `${fmt(objState.x)} ${fmt(objState.y)} ${fmt(objState.z)}`);
    el.setAttribute('scale', `${s} ${s} ${s}`);
    el.setAttribute('rotation', `${objState.rx} ${objState.ry} 0`);
  }

  // Tulis state editor ke tourData (dalam memori) supaya bisa di-Simpan
  function commitToTourData() {
    const spotId = currentSpotId;
    if (!spotId || editingIndex < 0 || !tourData[spotId]) return;
    const s = objState.scale;
    tourData[spotId].models[editingIndex] = {
      modelId: currentModelId,
      position: `${fmt(objState.x)} ${fmt(objState.y)} ${fmt(objState.z)}`,
      scale: `${s} ${s} ${s}`,
      rotation: `${objState.rx} ${objState.ry} 0`
    };
    hasUnsavedChanges = true;
  }

  function removeCurrentModel() {
    const spotId = currentSpotId;
    if (!spotId || editingIndex < 0 || !tourData[spotId]) return;
    tourData[spotId].models.splice(editingIndex, 1);
    editingIndex = -1;
    modelLoaded = false;
    hasUnsavedChanges = true;
    if (typeof loadSpot === 'function') loadSpot(spotId);
    updateInfo();
  }

  // ============ RAYCAST LIVE (meniru navigation-editor.js) ============
  function updateLiveTargetLoop() {
    if (isEditMode) {
      const camera = document.querySelector('#camera');
      if (camera) {
        const rot = camera.getAttribute('rotation');
        if (rot) {
          const pitchRad = (rot.x * Math.PI) / 180;
          const yawRad = (rot.y * Math.PI) / 180;
          const dy = -Math.sin(pitchRad);
          const horiz = Math.cos(pitchRad);
          const dx = -Math.sin(yawRad) * horiz;
          const dz = -Math.cos(yawRad) * horiz;

          if (dy < -0.02) {
            const t = FLOOR_Y / dy;
            liveTargetState.x = parseFloat((dx * t).toFixed(2));
            liveTargetState.y = FLOOR_Y;
            liveTargetState.z = parseFloat((dz * t).toFixed(2));
          } else {
            const dist = 6;
            liveTargetState.x = parseFloat((dx * dist).toFixed(2));
            liveTargetState.y = parseFloat((dy * dist).toFixed(2));
            liveTargetState.z = parseFloat((dz * dist).toFixed(2));
          }
          const liveText = document.getElementById('me-live-text');
          if (liveText) {
            liveText.textContent = `X: ${liveTargetState.x.toFixed(2)} | Y: ${liveTargetState.y.toFixed(2)} | Z: ${liveTargetState.z.toFixed(2)}`;
          }
        }
      }
    }
    requestAnimationFrame(updateLiveTargetLoop);
  }

  function lockLiveTarget() {
    if (editingIndex < 0) {
      objState.x = liveTargetState.x;
      objState.y = FLOOR_Y;
      objState.z = liveTargetState.z;
      ensureEntity();
    } else {
      objState.x = liveTargetState.x;
      objState.z = liveTargetState.z;
      applyState();
    }
    commitToTourData();
    updateInfo();
  }

  function alignObject() {
    if (editingIndex < 0) return;
    if (!modelLoaded) { alert('Tunggu model selesai dimuat.'); return; }
    const local = getLocalBBox();
    if (!local) { alert('Bounding box model belum terbaca. Coba tunggu beberapa detik.'); return; }
    const s = objState.scale;
    objState.x = liveTargetState.x - ((local.min.x + local.max.x) / 2) * s;
    objState.z = liveTargetState.z - ((local.min.z + local.max.z) / 2) * s;
    objState.y = FLOOR_Y - local.min.y * s;
    applyState();
    commitToTourData();
    updateInfo();
  }

  // ============ KONTROL NILAI ============
  function afterChange() { applyState(); commitToTourData(); updateInfo(); }

  function nudge(axis, amount) {
    if (editingIndex < 0) return;
    objState[axis] = parseFloat((objState[axis] + amount).toFixed(2));
    afterChange();
  }

  function setScale(value, updateSlider = true) {
    objState.scale = Math.min(10, Math.max(0.05, parseFloat(value.toFixed(2))));
    if (updateSlider) {
      const sl = document.getElementById('me-scale-slider');
      if (sl) sl.value = objState.scale;
    }
    afterChange();
  }

  function setRy(deg) {
    objState.ry = deg;
    const sl = document.getElementById('me-ry-slider');
    if (sl) sl.value = deg;
    afterChange();
  }

  function nudgeRx(amount) {
    objState.rx = (objState.rx + amount + 360) % 360;
    afterChange();
  }

  // ============ TAMPILKAN INFO ============
  function updateInfo() {
    const posText = document.getElementById('me-pos-text');
    if (posText) {
      posText.textContent = editingIndex < 0
        ? '(Belum ada object)'
        : `${fmt(objState.x)} ${fmt(objState.y)} ${fmt(objState.z)}`;
    }
    const scaleVal = document.getElementById('me-scale-val');
    if (scaleVal) scaleVal.textContent = objState.scale.toFixed(2);
    const ryVal = document.getElementById('me-ry-val');
    if (ryVal) ryVal.textContent = objState.ry + '°';

    const sizeInfo = document.getElementById('me-size-info');
    if (sizeInfo) {
      const m = measure();
      sizeInfo.textContent = editingIndex < 0 ? 'ukuran: -'
        : m ? `ukuran dunia: ${m.sizeX.toFixed(2)} x ${m.sizeY.toFixed(2)} x ${m.sizeZ.toFixed(2)} m`
        : 'memuat model...';
    }
    const saveBtn = document.getElementById('me-save-btn');
    if (saveBtn) {
      saveBtn.textContent = hasUnsavedChanges
        ? '💾 Simpan index.html (ada perubahan)'
        : '💾 Simpan index.html';
      saveBtn.style.background = hasUnsavedChanges ? '#16a34a' : '#475569';
    }
  }

  // ============ EKSPOR KE index.html ============

  function serializeTourData() {
    const out = ['const tourData = {'];
    const spotIds = Object.keys(tourData);

    spotIds.forEach((spotId, si) => {
      const s = tourData[spotId];
      out.push(`      "${spotId}": {`);
      out.push(`        sky: "${s.sky}",`);
      if (s.groundTarget) out.push(`        groundTarget: "${s.groundTarget}",`);

      out.push('        hotspots: [');
      const hs = s.hotspots || [];
      hs.forEach((h, i) => {
        const p = [];
        if (h.invisible) p.push('invisible: true');
        if (h.type) p.push(`type: "${h.type}"`);
        if (h.targetSpot) p.push(`targetSpot: "${h.targetSpot}"`);
        if (h.title !== undefined) p.push(`title: ${JSON.stringify(h.title)}`);
        if (h.description !== undefined) p.push(`description: ${JSON.stringify(h.description)}`);
        if (h.position) p.push(`position: "${h.position}"`);
        if (h.rotation) p.push(`rotation: "${h.rotation}"`);
        if (h.scale) p.push(`scale: "${h.scale}"`);
        if (h.scaleFrom) p.push(`scaleFrom: "${h.scaleFrom}"`);
        if (h.scaleTo) p.push(`scaleTo: "${h.scaleTo}"`);
        out.push(`          { ${p.join(', ')} }${i < hs.length - 1 ? ',' : ''}`);
      });
      out.push('        ],');

      out.push('        models: [');
      const ms = s.models || [];
      ms.forEach((m, i) => {
        const p = [`modelId: "${m.modelId}"`];
        if (m.position) p.push(`position: "${m.position}"`);
        if (m.scale) p.push(`scale: "${m.scale}"`);
        if (m.rotation) p.push(`rotation: "${m.rotation}"`);
        out.push(`          { ${p.join(', ')} }${i < ms.length - 1 ? ',' : ''}`);
      });
      out.push('        ]');
      out.push(`      }${si < spotIds.length - 1 ? ',' : ''}`);
    });

    out.push('    };');
    return out.join('\n');
  }

  async function saveIndexHtml() {
    let src;
    try {
      const res = await fetch('index.html', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      src = await res.text();
    } catch (err) {
      alert('Gagal membaca index.html (' + err.message + ').\n\nFitur ini hanya bisa dipakai kalau halaman dibuka lewat server (http://localhost/...), bukan dengan klik dua kali file.');
      return;
    }

    // Ganti blok tourData lama dengan versi yang sudah disunting
    const re = /const tourData = \{[\s\S]*?\n    \};/;
    if (!re.test(src)) {
      alert('Blok tourData tidak ditemukan di index.html. Pastikan file tidak sudah diedit manual.');
      return;
    }
    const updated = src.replace(re, serializeTourData());

    const blob = new Blob([updated], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    hasUnsavedChanges = false;
    updateInfo();
    const info = document.getElementById('me-size-info');
    if (info) info.textContent = 'tersimpan! ganti file index.html yang asli dengan file ini.';
  }

  // ============ PANEL UI ============
  function injectEditorUI() {
    const spotOptions = Array.from({ length: 18 }, (_, i) =>
      `<option value="nomor${i + 1}">nomor${i + 1}</option>`).join('');
    const modelOptions = [1, 2, 3, 4].map(n =>
      `<option value="#model${n}">3Dmodel${n}.glb</option>`).join('');

    const div = document.createElement('div');
    div.id = 'model-editor-panel';
    div.style.cssText = "position: fixed; top: 15px; left: 15px; z-index: 10000; background: rgba(15, 23, 42, 0.94); color: #ffffff; padding: 16px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid rgba(74, 222, 128, 0.35); backdrop-filter: blur(8px);";

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <strong style="font-size: 14px; color: #4ade80; display: flex; align-items: center; gap: 6px;">🧱 Object 3D Editor</strong>
        <button id="me-toggle-btn" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">Mode: OFF</button>
      </div>

      <div id="me-controls" style="display: none;">
        <p style="font-size: 10px; color: #94a3b8; margin: 0 0 10px 0; line-height: 1.35;">
          Mengedit object <strong>asli</strong> di tur. Klik
          <strong>💾 Simpan index.html</strong> di bawah supaya posisinya tidak hilang saat refresh.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
          <div>
            <label style="font-size: 11px; color: #cbd5e1; font-weight: bold; display: block; margin-bottom: 3px;">Spot Tujuan:</label>
            <select id="me-spot-select" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #4ade80; font-weight: bold; font-size: 12px; cursor: pointer;">${spotOptions}</select>
          </div>
          <div>
            <label style="font-size: 11px; color: #cbd5e1; font-weight: bold; display: block; margin-bottom: 3px;">Model:</label>
            <select id="me-model-select" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fbbf24; font-weight: bold; font-size: 12px; cursor: pointer;">${modelOptions}</select>
          </div>
        </div>

        <div style="background: rgba(34, 197, 94, 0.12); padding: 8px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(74, 222, 128, 0.25);">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #86efac; font-weight: bold; margin-bottom: 2px;">🎯 Titik Kursor (Real-time):</div>
          <div id="me-live-text" style="font-family: monospace; font-size: 12px; color: #4ade80; font-weight: bold;">X: 0.00 | Y: -1.80 | Z: -5.00</div>
        </div>

        <button id="me-lock-btn" style="width: 100%; background: #16a34a; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px; margin-bottom: 8px;">🎯 Tentukan Titik di Kursor Sekarang</button>

        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">Koordinat Object:</div>
          <div id="me-pos-text" style="font-family: monospace; font-size: 13px; color: #4ade80; font-weight: bold; margin-bottom: 8px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">(Belum ada object)</div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 8px;">
            <button id="me-nx1" style="padding: 4px; font-size: 10px; cursor: pointer;">X -0.5</button>
            <button id="me-nx2" style="padding: 4px; font-size: 10px; cursor: pointer;">X +0.5</button>
            <button id="me-ny1" style="padding: 4px; font-size: 10px; cursor: pointer;">Y +0.2</button>
            <button id="me-ny2" style="padding: 4px; font-size: 10px; cursor: pointer;">Y -0.2</button>
            <button id="me-nz1" style="padding: 4px; font-size: 10px; cursor: pointer;">Z -1.0</button>
            <button id="me-nz2" style="padding: 4px; font-size: 10px; cursor: pointer;">Z +1.0</button>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 2px;">
            <span>Ukuran (Scale): <span style="opacity: 0.6;">0.05 - 10</span></span><strong id="me-scale-val" style="color: #fbbf24;">1.00</strong>
          </div>
          <input id="me-scale-slider" type="range" min="0.05" max="10" step="0.05" value="1" style="width: 100%; box-sizing: border-box; cursor: pointer; margin-bottom: 6px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px;">
            <button id="me-scale-half" style="padding: 4px; font-size: 10px; cursor: pointer;">Setengah</button>
            <button id="me-scale-dbl" style="padding: 4px; font-size: 10px; cursor: pointer;">Dua Kali</button>
            <button id="me-scale-x10" style="padding: 4px; font-size: 10px; cursor: pointer;">x10</button>
            <button id="me-scale-reset" style="padding: 4px; font-size: 10px; cursor: pointer;">Reset 1.0</button>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 2px;">
            <span>Putar Arah Object (RY):</span><strong id="me-ry-val" style="color: #4ade80;">0°</strong>
          </div>
          <input id="me-ry-slider" type="range" min="0" max="360" value="0" style="width: 100%; box-sizing: border-box; cursor: pointer; margin-bottom: 6px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px;">
            <button id="me-ry-0" style="padding: 4px; font-size: 10px; cursor: pointer;">⬆️ 0°</button>
            <button id="me-ry-90" style="padding: 4px; font-size: 10px; cursor: pointer;">➡️ 90°</button>
            <button id="me-ry-180" style="padding: 4px; font-size: 10px; cursor: pointer;">⬇️ 180°</button>
            <button id="me-ry-270" style="padding: 4px; font-size: 10px; cursor: pointer;">⬅️ 270°</button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <button id="me-rx1" style="padding: 4px; font-size: 10px; cursor: pointer;">RX +5°</button>
            <button id="me-rx2" style="padding: 4px; font-size: 10px; cursor: pointer;">RX -5°</button>
          </div>
        </div>

        <button id="me-align-btn" style="width: 100%; background: #0369a1; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px; margin-bottom: 8px;">📐 Ratakan &amp; Pusatkan</button>

        <div id="me-size-info" style="font-size: 10px; color: #94a3b8; text-align: center; margin-bottom: 8px; font-family: monospace;">ukuran: -</div>

        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <button id="me-save-btn" style="flex: 1; background: #475569; color: white; border: none; padding: 9px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">💾 Simpan index.html</button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="me-copy-btn" style="flex: 1; background: #334155; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">📋 Copy Baris</button>
          <button id="me-remove-btn" style="background: #dc2626; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">🗑️ Hapus</button>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    bindEvents();
  }

  function bindEvents() {
    const $ = (id) => document.getElementById(id);

    $('me-toggle-btn').addEventListener('click', toggleEditMode);
    $('me-lock-btn').addEventListener('click', lockLiveTarget);
    $('me-align-btn').addEventListener('click', alignObject);
    $('me-copy-btn').addEventListener('click', copyModelCode);
    $('me-remove-btn').addEventListener('click', removeCurrentModel);
    $('me-save-btn').addEventListener('click', saveIndexHtml);

    $('me-spot-select').addEventListener('change', (e) => {
      currentSpotId = e.target.value;
      if (typeof loadSpot === 'function') loadSpot(currentSpotId);
      syncFromTourData(true);
    });

    $('me-model-select').addEventListener('change', (e) => {
      currentModelId = e.target.value;
      syncFromTourData(true);
    });

    $('me-nx1').addEventListener('click', () => nudge('x', -0.5));
    $('me-nx2').addEventListener('click', () => nudge('x', 0.5));
    $('me-ny1').addEventListener('click', () => nudge('y', 0.2));
    $('me-ny2').addEventListener('click', () => nudge('y', -0.2));
    $('me-nz1').addEventListener('click', () => nudge('z', -1.0));
    $('me-nz2').addEventListener('click', () => nudge('z', 1.0));

    $('me-scale-half').addEventListener('click', () => setScale(objState.scale / 2));
    $('me-scale-dbl').addEventListener('click', () => setScale(objState.scale * 2));
    $('me-scale-x10').addEventListener('click', () => setScale(objState.scale * 10));
    $('me-scale-reset').addEventListener('click', () => setScale(1));
    $('me-scale-slider').addEventListener('input', (e) => setScale(parseFloat(e.target.value), false));

    ['0', '90', '180', '270'].forEach((deg) => {
      $('me-ry-' + deg).addEventListener('click', () => setRy(parseInt(deg, 10)));
    });
    $('me-ry-slider').addEventListener('input', (e) => setRy(parseInt(e.target.value, 10)));

    $('me-rx1').addEventListener('click', () => nudgeRx(5));
    $('me-rx2').addEventListener('click', () => nudgeRx(-5));
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('me-toggle-btn');
    const controls = document.getElementById('me-controls');

    if (isEditMode) {
      const navBtn = document.getElementById('toggle-editor-btn');
      if (navBtn && navBtn.textContent.includes('EDITING')) navBtn.click();

      currentSpotId = getCurrentSpot();
      const spotSel = document.getElementById('me-spot-select');
      if (currentSpotId && spotSel) spotSel.value = currentSpotId;
      const modelSel = document.getElementById('me-model-select');
      if (modelSel) modelSel.value = currentModelId;

      btn.textContent = 'Mode: EDITING (ON)';
      btn.style.background = '#16a34a';
      controls.style.display = 'block';

      syncFromTourData(true);
    } else {
      btn.textContent = 'Mode: OFF';
      btn.style.background = '#2563eb';
      controls.style.display = 'none';
    }
  }

  // Setiap spot berpindah, muat ulang objek yang sedang disunting dari tourData
  function watchSpotChange() {
    const sky = document.querySelector('#main-sky');
    if (!sky) return;
    const observer = new MutationObserver(() => {
      const spot = getCurrentSpot();
      if (!spot) return;
      if (isEditMode) {
        currentSpotId = spot;
        const sel = document.getElementById('me-spot-select');
        if (sel) sel.value = spot;
        syncFromTourData(false);
      }
    });
    observer.observe(sky, { attributes: true, attributeFilter: ['src'] });
  }

  function copyModelCode() {
    if (editingIndex < 0 || !currentSpotId) { alert('Belum ada object untuk disalin.'); return; }
    const m = tourData[currentSpotId].models[editingIndex];
    const code = `{ modelId: "${m.modelId}", position: "${m.position}", scale: "${m.scale}", rotation: "${m.rotation}" }`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => prompt('Salin baris berikut:', code));
    } else {
      prompt('Salin baris berikut:', code);
    }
  }

  // ============ INISIALISASI ============
  window.addEventListener('load', () => {
    injectEditorUI();
    updateLiveTargetLoop();
    watchSpotChange();
  });
})();
