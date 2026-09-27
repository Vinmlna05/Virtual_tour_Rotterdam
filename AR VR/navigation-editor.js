/* =================================================================
   TEMPORARY NAVIGATION EDITOR (STANDALONE FILE)
   Jika semua posisi hotspot sudah selesai Anda tentukan:
   1. Hapus file ini (navigation-editor.js)
   2. Hapus baris script berikut di index.html:
      <script src="navigation-editor.js"></script>
   ================================================================= */

(function () {
  let isEditMode = false;
  let tempHotspotState = {
    x: 0,
    y: -1.8,
    z: -5,
    rx: -70,
    ry: 0,
    rz: 0
  };
  let liveTargetState = { x: 0, y: -1.8, z: -5 };
  let hasTempHotspot = false;

  // Inject HTML UI Floating Control Panel ke halaman
  function injectEditorUI() {
    const editorDiv = document.createElement('div');
    editorDiv.id = 'temp-editor-panel';
    editorDiv.style.cssText = "position: fixed; top: 15px; right: 15px; z-index: 10000; background: rgba(15, 23, 42, 0.94); color: #ffffff; padding: 16px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);";

    editorDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <strong style="font-size: 14px; color: #38b6ff; display: flex; align-items: center; gap: 6px;">
          🎯 Navigation Raycast Editor
        </strong>
        <button id="toggle-editor-btn" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">
          Mode: OFF
        </button>
      </div>

      <div id="editor-controls" style="display: none;">
        <!-- Live Cursor Real-time Target Display -->
        <div style="background: rgba(37, 99, 235, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); padding: 8px 10px; border-radius: 8px; margin-bottom: 10px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #93c5fd; font-weight: bold; margin-bottom: 2px;">🎯 Target Kursor (Real-time):</div>
          <div id="live-target-text" style="font-family: monospace; font-size: 12px; color: #60a5fa; font-weight: bold;">
            X: 0.00 | Y: -1.80 | Z: -5.00
          </div>
        </div>

        <!-- Pilihan Tipe Hotspot -->
        <div style="margin-bottom: 10px;">
          <label style="font-size: 11px; color: #cbd5e1; font-weight: bold; display: block; margin-bottom: 3px;">Tipe Hotspot:</label>
          <select id="temp-type-select" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #38b6ff; font-weight: bold; font-size: 12px; cursor: pointer;">
            <option value="nav">🧭 Navigasi (Panah Pindah Spot)</option>
            <option value="info">ℹ️ Informasi / Reservasi (Icon i)</option>
          </select>
        </div>

        <!-- Input Judul Label Hotspot -->
        <div style="margin-bottom: 10px;">
          <label style="font-size: 11px; color: #cbd5e1; font-weight: bold; display: block; margin-bottom: 3px;">Teks Label Hotspot:</label>
          <input id="temp-label-input" type="text" value="Ruangan Reservasi" placeholder="Ketik label teks..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #38b6ff; font-weight: bold; font-size: 12px;">
        </div>

        <!-- Input Deskripsi Info (Khusus Tipe Info) -->
        <div id="desc-input-container" style="display: none; margin-bottom: 10px;">
          <label style="font-size: 11px; color: #cbd5e1; font-weight: bold; display: block; margin-bottom: 3px;">Deskripsi Pop-up Info:</label>
          <input id="temp-desc-input" type="text" value="Pendaftaran & Informasi Reservasi Tiket Kunjungan." placeholder="Ketik deskripsi info..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #38b6ff; font-weight: bold; font-size: 12px;">
        </div>

        <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px 0; line-height: 1.3;">
          Arahkan lingkaran kursor hijau ke lokasi yang diinginkan, lalu klik <strong>Tentukan Titik di Kursor</strong> atau klik langsung pada panorama.
        </p>

        <!-- Display & Manual Adjustment Controls -->
        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">Koordinat Terkunci (X, Y, Z):</div>
          <div id="coord-pos-text" style="font-family: monospace; font-size: 13px; color: #4ade80; font-weight: bold; margin-bottom: 8px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">
            (Belum ada titik dipilih)
          </div>

          <button id="btn-lock-live" style="width: 100%; background: #0284c7; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px; margin-bottom: 8px;">
            🎯 Tentukan Titik di Kursor Sekarang
          </button>

          <!-- Position Nudge Buttons -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 8px;">
            <button id="btn-nx1" style="padding: 4px; font-size: 10px; cursor: pointer;">X -0.5</button>
            <button id="btn-nx2" style="padding: 4px; font-size: 10px; cursor: pointer;">X +0.5</button>
            <button id="btn-ny1" style="padding: 4px; font-size: 10px; cursor: pointer;">Y +0.2 (Atas)</button>
            <button id="btn-ny2" style="padding: 4px; font-size: 10px; cursor: pointer;">Y -0.2 (Bawah)</button>
            <button id="btn-nz1" style="padding: 4px; font-size: 10px; cursor: pointer;">Z -1.0 (Maju)</button>
            <button id="btn-nz2" style="padding: 4px; font-size: 10px; cursor: pointer;">Z +1.0 (Mundur)</button>
          </div>

          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">Rotasi Kemiringan (RX, RY, RZ):</div>
          <div id="coord-rot-text" style="font-family: monospace; font-size: 12px; color: #facc15; font-weight: bold; margin-bottom: 6px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">
            -70 0 0
          </div>

          <button id="btn-reset-rx" style="width: 100%; background: #334155; color: #38b6ff; border: 1px solid rgba(56,182,255,0.4); padding: 5px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; margin-bottom: 8px;">
            📐 Reset Kemiringan Lantai (RX = -75°)
          </button>

          <!-- Slider Putar 360 Derajat RY -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 2px;">
              <span>Putar Arah Panah 360° (RY):</span>
              <strong id="ry-val-text" style="color: #4ade80;">0°</strong>
            </div>
            <input id="ry-slider" type="range" min="0" max="360" value="0" style="width: 100%; box-sizing: border-box; cursor: pointer;">
          </div>

          <!-- Quick Compass Direction Buttons -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px;">
            <button id="btn-ry-0" style="padding: 4px; font-size: 10px; cursor: pointer;">⬆️ 0°</button>
            <button id="btn-ry-90" style="padding: 4px; font-size: 10px; cursor: pointer;">➡️ 90°</button>
            <button id="btn-ry-180" style="padding: 4px; font-size: 10px; cursor: pointer;">⬇️ 180°</button>
            <button id="btn-ry-270" style="padding: 4px; font-size: 10px; cursor: pointer;">⬅️ 270°</button>
          </div>

          <!-- Rotation Fine Nudge Buttons -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
            <button id="btn-rx1" style="padding: 4px; font-size: 10px; cursor: pointer;">Kemiringan X +5°</button>
            <button id="btn-rx2" style="padding: 4px; font-size: 10px; cursor: pointer;">Kemiringan X -5°</button>
            <button id="btn-ry1" style="padding: 4px; font-size: 10px; cursor: pointer;">Putar Y +15°</button>
            <button id="btn-ry2" style="padding: 4px; font-size: 10px; cursor: pointer;">Putar Y -15°</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 6px;">
          <button id="btn-copy" style="flex: 1; background: #16a34a; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">
            📋 Copy Coordinate
          </button>
          <button id="btn-remove" style="background: #dc2626; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">
            🗑️ Remove
          </button>
        </div>

        <div id="copy-toast" style="display: none; color: #4ade80; font-size: 11px; text-align: center; margin-top: 6px; font-weight: bold;">
          ✓ Kode koordinat telah disalin ke clipboard!
        </div>
      </div>
    `;

    document.body.appendChild(editorDiv);

    // Bind Event Listeners
    document.getElementById('toggle-editor-btn').addEventListener('click', toggleEditMode);
    document.getElementById('btn-lock-live').addEventListener('click', lockLiveTarget);
    document.getElementById('temp-label-input').addEventListener('input', renderTempHotspot);
    document.getElementById('temp-desc-input').addEventListener('input', renderTempHotspot);

    const typeSelect = document.getElementById('temp-type-select');
    typeSelect.addEventListener('change', () => {
      const isInfo = typeSelect.value === 'info';
      document.getElementById('desc-input-container').style.display = isInfo ? 'block' : 'none';
      if (hasTempHotspot) {
        tempHotspotState.rx = isInfo ? 0 : -75;
      }
      renderTempHotspot();
    });

    document.getElementById('btn-nx1').addEventListener('click', () => nudgePos('x', -0.5));
    document.getElementById('btn-nx2').addEventListener('click', () => nudgePos('x', 0.5));
    document.getElementById('btn-ny1').addEventListener('click', () => nudgePos('y', 0.2));
    document.getElementById('btn-ny2').addEventListener('click', () => nudgePos('y', -0.2));
    document.getElementById('btn-nz1').addEventListener('click', () => nudgePos('z', -1.0));
    document.getElementById('btn-nz2').addEventListener('click', () => nudgePos('z', 1.0));

    // Reset Kemiringan Lantai
    document.getElementById('btn-reset-rx').addEventListener('click', () => {
      tempHotspotState.rx = -75;
      renderTempHotspot();
    });

    // Slider Rotasi RY 360 Derajat
    const rySlider = document.getElementById('ry-slider');
    rySlider.addEventListener('input', (e) => {
      tempHotspotState.ry = parseInt(e.target.value, 10);
      renderTempHotspot();
    });

    // Preset Arah Kompas 0, 90, 180, 270
    document.getElementById('btn-ry-0').addEventListener('click', () => { tempHotspotState.ry = 0; renderTempHotspot(); });
    document.getElementById('btn-ry-90').addEventListener('click', () => { tempHotspotState.ry = 90; renderTempHotspot(); });
    document.getElementById('btn-ry-180').addEventListener('click', () => { tempHotspotState.ry = 180; renderTempHotspot(); });
    document.getElementById('btn-ry-270').addEventListener('click', () => { tempHotspotState.ry = 270; renderTempHotspot(); });

    document.getElementById('btn-rx1').addEventListener('click', () => nudgeRot('x', 5));
    document.getElementById('btn-rx2').addEventListener('click', () => nudgeRot('x', -5));
    document.getElementById('btn-ry1').addEventListener('click', () => nudgeRot('y', 15));
    document.getElementById('btn-ry2').addEventListener('click', () => nudgeRot('y', -15));

    document.getElementById('btn-copy').addEventListener('click', copyCoordinates);
    document.getElementById('btn-remove').addEventListener('click', removeTempHotspot);
  }

  // Real-Time Camera Cursor Raycast Tracking Loop
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

          const groundY = -1.8;
          if (dy < -0.02) {
            const t = groundY / dy;
            liveTargetState.x = parseFloat((dx * t).toFixed(2));
            liveTargetState.y = groundY;
            liveTargetState.z = parseFloat((dz * t).toFixed(2));
          } else {
            const dist = 6;
            liveTargetState.x = parseFloat((dx * dist).toFixed(2));
            liveTargetState.y = parseFloat((dy * dist).toFixed(2));
            liveTargetState.z = parseFloat((dz * dist).toFixed(2));
          }

          const liveText = document.getElementById('live-target-text');
          if (liveText) {
            liveText.textContent = `X: ${liveTargetState.x.toFixed(2)} | Y: ${liveTargetState.y.toFixed(2)} | Z: ${liveTargetState.z.toFixed(2)}`;
          }
        }
      }
    }
    requestAnimationFrame(updateLiveTargetLoop);
  }

  // Toggle Mode Edit
  function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('toggle-editor-btn');
    const controls = document.getElementById('editor-controls');

    if (isEditMode) {
      btn.textContent = 'Mode: EDITING (ON)';
      btn.style.background = '#16a34a';
      controls.style.display = 'block';
    } else {
      btn.textContent = 'Mode: OFF';
      btn.style.background = '#2563eb';
      controls.style.display = 'none';
    }
  }

  // Kunci koordinat dari posisi live cursor sekarang
  function lockLiveTarget() {
    tempHotspotState.x = liveTargetState.x;
    tempHotspotState.y = liveTargetState.y;
    tempHotspotState.z = liveTargetState.z;
    hasTempHotspot = true;
    renderTempHotspot();
  }

  function getBadgeDataURL(topColor, bottomColor) {
    let svg = '';
    if (bottomColor) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256">
        <defs>
          <clipPath id="c"><rect width="512" height="256" rx="32" ry="32"/></clipPath>
        </defs>
        <g clip-path="url(#c)">
          <rect width="512" height="128" fill="${topColor}"/>
          <rect y="128" width="512" height="128" fill="${bottomColor}"/>
        </g>
      </svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128">
        <rect width="512" height="128" rx="32" ry="32" fill="${topColor}"/>
      </svg>`;
    }
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // Render / Update Hotspot Sementara (Lengkap dengan Panah & Label Teks Biru)
  function renderTempHotspot() {
    if (!hasTempHotspot) return;

    let tempEl = document.querySelector('#temp-hotspot-entity');

    if (!tempEl) {
      tempEl = document.createElement('a-entity');
      tempEl.setAttribute('id', 'temp-hotspot-entity');

      // 1. Ikon Panah Lingkaran dengan Bouncing
      const icon = document.createElement('a-image');
      icon.setAttribute('src', '#hotspot-icon');
      icon.setAttribute('scale', '1.2 1.2 1.2');
      icon.setAttribute('material', 'transparent: true');
      icon.setAttribute('animation__bounce', 'property: position; from: 0 0 0; to: 0 0.2 0; dir: alternate; loop: true; dur: 800; easing: easeInOutSine');
      tempEl.appendChild(icon);

      // 2. Group Label Teks Badge Biru
      const labelGroup = document.createElement('a-entity');
      labelGroup.setAttribute('id', 'temp-label-group');
      labelGroup.setAttribute('position', '0 0.7 0.5');
      labelGroup.setAttribute('rotation', '70 0 0'); // Menetralkan rotasi agar berdiri tegak
      tempEl.appendChild(labelGroup);

      const scene = document.querySelector('a-scene');
      if (scene) scene.appendChild(tempEl);
    }

    // Atur Posisi dan Rotasi Sesuai State
    const posStr = `${tempHotspotState.x} ${tempHotspotState.y} ${tempHotspotState.z}`;
    const rotStr = `${tempHotspotState.rx} ${tempHotspotState.ry} ${tempHotspotState.rz}`;

    tempEl.setAttribute('position', posStr);

    // Update Tipe Icon, Teks Label & Ukuran Badge Sesuai Input User
    const isInfo = document.getElementById('temp-type-select')?.value === 'info';
    if (isInfo) {
      tempEl.setAttribute('look-at', '#camera');
    } else {
      tempEl.removeAttribute('look-at');
      tempEl.setAttribute('rotation', rotStr);
    }

    const iconEl = tempEl.querySelector('a-image');
    if (iconEl) {
      iconEl.setAttribute('src', isInfo ? '#info-icon' : '#hotspot-icon');
      iconEl.setAttribute('scale', isInfo ? '0.6 0.6 0.6' : '1.2 1.2 1.2');
      if (isInfo) {
        iconEl.removeAttribute('animation__bounce');
      } else if (!iconEl.getAttribute('animation__bounce')) {
        iconEl.setAttribute('animation__bounce', 'property: position; from: 0 0 0; to: 0 0.2 0; dir: alternate; loop: true; dur: 800; easing: easeInOutSine');
      }
    }

    const inputTitle = document.getElementById('temp-label-input').value || 'Nama Lokasi';
    const inputDesc = document.getElementById('temp-desc-input').value || '';
    const labelGroup = document.querySelector('#temp-label-group');

    if (labelGroup) {
      labelGroup.innerHTML = ''; // Refresh elemen badge & teks secara bersih

      const hasDesc = isInfo && inputDesc.trim().length > 0;
      const titleText = inputTitle;
      const descText = hasDesc ? inputDesc : '';

      if (hasDesc) {
        const maxLen = Math.max(titleText.length, descText.length * 0.65);
        const badgeWidth = Math.max(1.6, Math.min(maxLen * 0.07 + 0.5, 3.2));
        const labelX = (badgeWidth / 2) + 0.35;

        labelGroup.setAttribute('position', `${labelX} 0 0.05`);
        labelGroup.setAttribute('rotation', '0 0 0');

        const cardHeight = 0.58;
        const badgeEl = document.createElement('a-image');
        badgeEl.setAttribute('src', getBadgeDataURL('#29b6f6', '#ffffff'));
        badgeEl.setAttribute('height', cardHeight.toString());
        badgeEl.setAttribute('width', badgeWidth.toString());
        badgeEl.setAttribute('material', 'transparent: true; opacity: 0.98; depthTest: false');

        const textTitle = document.createElement('a-text');
        textTitle.setAttribute('value', titleText);
        textTitle.setAttribute('align', 'center');
        textTitle.setAttribute('color', '#FFFFFF');
        textTitle.setAttribute('width', (badgeWidth * 0.85).toString());
        textTitle.setAttribute('wrap-count', Math.max(16, titleText.length + 2).toString());
        textTitle.setAttribute('position', `0 0.16 0.02`);
        textTitle.setAttribute('material', 'shader: flat; depthTest: false');

        const descWrap = descText.length <= 25 
          ? Math.max(22, descText.length + 2) 
          : Math.max(26, Math.ceil(descText.length / 1.7) + 3);

        const textDesc = document.createElement('a-text');
        textDesc.setAttribute('value', descText);
        textDesc.setAttribute('align', 'center');
        textDesc.setAttribute('color', '#0f172a');
        textDesc.setAttribute('width', (badgeWidth * 0.85).toString());
        textDesc.setAttribute('wrap-count', descWrap.toString());
        textDesc.setAttribute('position', `0 -0.11 0.02`);
        textDesc.setAttribute('material', 'shader: flat; depthTest: false');

        labelGroup.appendChild(badgeEl);
        labelGroup.appendChild(textTitle);
        labelGroup.appendChild(textDesc);
      } else {
        const badgeWidth = Math.max(1.3, Math.min(titleText.length * 0.08 + 0.4, 2.8));
        const labelX = (badgeWidth / 2) + 0.35;

        if (isInfo) {
          labelGroup.setAttribute('position', `${labelX} 0 0.05`);
          labelGroup.setAttribute('rotation', '0 0 0');
        } else {
          labelGroup.setAttribute('position', '0 0.7 0.3');
          labelGroup.setAttribute('look-at', '#camera');
        }

        const badgeEl = document.createElement('a-image');
        badgeEl.setAttribute('src', getBadgeDataURL('#29b6f6'));
        badgeEl.setAttribute('height', '0.30');
        badgeEl.setAttribute('width', badgeWidth.toString());
        badgeEl.setAttribute('material', 'transparent: true; opacity: 0.95; depthTest: false');

        const textEl = document.createElement('a-text');
        textEl.setAttribute('value', titleText);
        textEl.setAttribute('align', 'center');
        textEl.setAttribute('color', '#FFFFFF');
        textEl.setAttribute('width', (badgeWidth * 0.85).toString());
        textEl.setAttribute('wrap-count', Math.max(15, titleText.length + 2).toString());
        textEl.setAttribute('position', '0 0 0.02');
        textEl.setAttribute('material', 'shader: flat; depthTest: false');

        labelGroup.appendChild(badgeEl);
        labelGroup.appendChild(textEl);
      }
    }

    document.getElementById('coord-pos-text').textContent = posStr;
    document.getElementById('coord-rot-text').textContent = rotStr;

    const normalizedRY = ((tempHotspotState.ry % 360) + 360) % 360;
    const rySlider = document.getElementById('ry-slider');
    const ryValText = document.getElementById('ry-val-text');
    if (rySlider) rySlider.value = normalizedRY;
    if (ryValText) ryValText.textContent = normalizedRY + '°';
  }

  function nudgePos(axis, amount) {
    if (!hasTempHotspot) return;
    tempHotspotState[axis] = parseFloat((tempHotspotState[axis] + amount).toFixed(2));
    renderTempHotspot();
  }

  function nudgeRot(axis, amount) {
    if (!hasTempHotspot) return;
    const rotKey = 'r' + axis;
    tempHotspotState[rotKey] = (tempHotspotState[rotKey] + amount) % 360;
    renderTempHotspot();
  }

  function copyCoordinates() {
    if (!hasTempHotspot) {
      alert('Silakan tentukan titik terlebih dahulu!');
      return;
    }

    const typeVal = document.getElementById('temp-type-select').value;
    const inputTitle = document.getElementById('temp-label-input').value || 'Nama Lokasi';
    const inputDesc = document.getElementById('temp-desc-input').value || 'Deskripsi informasi...';

    let formattedCode = '';
    if (typeVal === 'info') {
      formattedCode = `{ type: "info", title: "${inputTitle}", description: "${inputDesc}", position: "${tempHotspotState.x} ${tempHotspotState.y} ${tempHotspotState.z}", rotation: "${tempHotspotState.rx} ${tempHotspotState.ry} ${tempHotspotState.rz}" }`;
    } else {
      formattedCode = `{ targetSpot: "nomorX", title: "${inputTitle}", position: "${tempHotspotState.x} ${tempHotspotState.y} ${tempHotspotState.z}", rotation: "${tempHotspotState.rx} ${tempHotspotState.ry} ${tempHotspotState.rz}" }`;
    }

    navigator.clipboard.writeText(formattedCode).then(() => {
      const toast = document.getElementById('copy-toast');
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 2500);
    }).catch(() => {
      prompt('Salin kode koordinat berikut:', formattedCode);
    });
  }

  function removeTempHotspot() {
    const tempEl = document.querySelector('#temp-hotspot-entity');
    if (tempEl) tempEl.remove();
    hasTempHotspot = false;
    document.getElementById('coord-pos-text').textContent = '(Belum ada titik dipilih)';
  }

  // Inisialisasi setelah Halaman dan A-Scene terisi
  window.addEventListener('load', () => {
    injectEditorUI();
    updateLiveTargetLoop();

    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('click', (e) => {
        if (!isEditMode) return;
        if (e.target && e.target.closest('#temp-editor-panel')) return;

        lockLiveTarget();
      });
    }
  });
})();
