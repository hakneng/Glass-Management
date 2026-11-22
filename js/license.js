/**
 * Digital Gradebook & Academic Management System
 * System Licensing, Copy Protection & Device Binding Module
 * ម៉ូឌុលគ្រប់គ្រងអាជ្ញាប័ណ្ណ និងការពារកម្មសិទ្ធិបញ្ញា
 */

(function (window) {
  'use strict';

  // Secret Salt for cryptographic key generation - only known to author
  const LICENSE_SECRET = 'AGY_GLASS_ACADEMIC_SYS_PRO_SECURE_SALT_2026_#789X!';
  
  // Master Developer Passwords for emergency/on-site unlock without key
  const MASTER_PASSWORDS = ['GLASS@DEV2026', 'KHMER@EDU#2026', 'ADMIN@GLASS99'];

  const STORAGE_KEY_MACHINE = 'glass_sys_machine_id';
  const STORAGE_KEY_LICENSE = 'glass_sys_license_data';

  // Pure JavaScript SHA-256 implementation (100% offline, works with file:// protocol)
  function sha256(ascii) {
    function utf8Encode(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) bytes.push(code);
        else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        else if (code < 0xd800 || code >= 0xe000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        else {
          i++;
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
          bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
      }
      return bytes;
    }
    function rotr(n, b) { return (n >>> b) | (n << (32 - b)); }
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const bytes = utf8Encode(ascii);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    const high = Math.floor(bitLen / 0x100000000);
    const low = bitLen >>> 0;
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? ((high >>> ((i - 4) * 8)) & 0xff) : ((low >>> (i * 8)) & 0xff));
    const W = new Array(64);
    for (let chunk = 0; chunk < bytes.length; chunk += 64) {
      for (let t = 0; t < 16; t++) {
        const idx = chunk + t * 4;
        W[t] = ((bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3]) >>> 0;
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ ((~e) & g);
        const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    let hex = '';
    for (let i = 0; i < 8; i++) {
      let v = H[i].toString(16);
      while (v.length < 8) v = '0' + v;
      hex += v;
    }
    return hex;
  }

  const License = {
    /**
     * Get or generate a persistent unique Machine ID for this device/installation
     * Format: MID-XXXX-XXXX-XXXX
     */
    getMachineId() {
      let mid = null;
      try {
        mid = localStorage.getItem(STORAGE_KEY_MACHINE);
      } catch (e) {}

      if (!mid || !/^MID-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/i.test(mid)) {
        // Collect hardware/browser environment seeds
        const nav = typeof navigator !== 'undefined' ? navigator : { userAgent: '', hardwareConcurrency: 4, language: 'km' };
        const scr = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '1920x1080';
        const seedParts = [
          nav.userAgent || '',
          scr,
          typeof screen !== 'undefined' ? (screen.colorDepth || 24) : 24,
          nav.hardwareConcurrency || 4,
          nav.language || 'km',
          Date.now(),
          Math.random()
        ];
        const hash = sha256(seedParts.join('::')).toUpperCase();
        mid = `MID-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
        try {
          localStorage.setItem(STORAGE_KEY_MACHINE, mid);
        } catch (e) {}
      }
      return mid.toUpperCase();
    },

    /**
     * Generate an activation key (Used by generator and master unlock)
     */
    generateKey(machineId, durationCode) {
      const m = machineId.trim().toUpperCase();
      const d = durationCode.trim().toUpperCase();
      const hash = sha256(`${m}:${d}:${LICENSE_SECRET}`).toUpperCase();
      return `GLS-${d}-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
    },

    /**
     * Verify an entered License Key against current Machine ID
     */
    verifyKey(key, machineId) {
      if (!key || typeof key !== 'string') {
        return { valid: false, reason: 'សូមបញ្ចូលកូនសោរអាជ្ញាប័ណ្ណ (License Key)!' };
      }
      const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
      const match = cleanKey.match(/^GLS-(LIFE|\d{8})-([A-F0-9]{4})-([A-F0-9]{4})-([A-F0-9]{4})$/);
      if (!match) {
        return { valid: false, reason: 'ទម្រង់កូនសោរមិនត្រឹមត្រូវ! (គំរូ៖ GLS-20271031-XXXX-XXXX-XXXX)' };
      }

      const duration = match[1];
      const sig = match[2] + match[3] + match[4];
      const currentMid = (machineId || this.getMachineId()).trim().toUpperCase();

      const expectedHash = sha256(`${currentMid}:${duration}:${LICENSE_SECRET}`).toUpperCase();
      if (sig !== expectedHash.slice(0, 12)) {
        return { valid: false, reason: 'កូនសោរនេះមិនត្រឹមត្រូវ ឬមិនត្រូវជាមួយកូដសម្គាល់ម៉ាស៊ីន (Machine ID) នេះទេ!' };
      }

      // Check Expiration Date
      let expiryFormatted = 'ពេញមួយជីវិត (Lifetime)';
      let expiryDateObj = null;

      if (duration !== 'LIFE') {
        const y = parseInt(duration.slice(0, 4), 10);
        const m = parseInt(duration.slice(4, 6), 10) - 1;
        const d = parseInt(duration.slice(6, 8), 10);
        expiryDateObj = new Date(y, m, d, 23, 59, 59);

        if (isNaN(expiryDateObj.getTime())) {
          return { valid: false, reason: 'កាលបរិច្ឆេទក្នុងកូនសោរមិនត្រឹមត្រូវ!' };
        }

        const now = new Date();
        if (now > expiryDateObj) {
          return { valid: false, reason: `កូនសោរនេះបានផុតកំណត់សុពលភាពកាលពីថ្ងៃទី ${d}/${m + 1}/${y} ហើយ!` };
        }

        expiryFormatted = `ថ្ងៃទី ${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
      }

      return {
        valid: true,
        key: cleanKey,
        machineId: currentMid,
        duration,
        expiryFormatted,
        expiryDateObj
      };
    },

    /**
     * Get current activation status
     */
    getStatus() {
      const mid = this.getMachineId();
      let rawData = null;
      try {
        rawData = localStorage.getItem(STORAGE_KEY_LICENSE);
      } catch (e) {}

      if (!rawData) {
        return { isActivated: false, machineId: mid, reason: 'មិនទាន់ធ្វើឱ្យសកម្ម (Not Activated)' };
      }

      let data;
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        return { isActivated: false, machineId: mid, reason: 'ទិន្នន័យអាជ្ញាប័ណ្ណខូច' };
      }

      // Verify that stored license matches current machine
      if (!data.key || data.machineId !== mid) {
        return { isActivated: false, machineId: mid, reason: 'កូដម៉ាស៊ីនមិនត្រូវគ្នា' };
      }

      // Verify integrity checksum
      const expectedChecksum = sha256(`${data.key}:${data.machineId}:${data.duration}:${LICENSE_SECRET}`);
      if (data.checksum !== expectedChecksum) {
        return { isActivated: false, machineId: mid, reason: 'ទិន្នន័យអាជ្ញាប័ណ្ណត្រូវបានកែប្រែដោយខុសច្បាប់' };
      }

      // Check Expiration
      if (data.duration !== 'LIFE') {
        const y = parseInt(data.duration.slice(0, 4), 10);
        const m = parseInt(data.duration.slice(4, 6), 10) - 1;
        const d = parseInt(data.duration.slice(6, 8), 10);
        const expiryDate = new Date(y, m, d, 23, 59, 59);
        const now = new Date();

        if (now > expiryDate) {
          return {
            isActivated: false,
            isExpired: true,
            machineId: mid,
            key: data.key,
            expiryFormatted: data.expiryFormatted,
            reason: `អាជ្ញាប័ណ្ណបានផុតកំណត់កាលពីថ្ងៃទី ${data.expiryFormatted}!`
          };
        }

        // Anti-clock rollback check: date shouldn't move backwards significantly
        if (data.lastCheckedDate) {
          const lastDate = new Date(data.lastCheckedDate);
          if (now.getTime() < lastDate.getTime() - (2 * 86400000)) {
            return {
              isActivated: false,
              isClockTampered: true,
              machineId: mid,
              reason: 'បានរកឃើញការកែប្រែកាលបរិច្ឆេទកុំព្យូទ័រមិនប្រក្រតី!'
            };
          }
        }

        // Update last checked date
        try {
          data.lastCheckedDate = now.toISOString().slice(0, 10);
          localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(data));
        } catch (e) {}

        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          isActivated: true,
          isExpired: false,
          machineId: mid,
          key: data.key,
          duration: data.duration,
          expiryFormatted: data.expiryFormatted,
          daysLeft
        };
      }

      return {
        isActivated: true,
        isExpired: false,
        isLifetime: true,
        machineId: mid,
        key: data.key,
        duration: 'LIFE',
        expiryFormatted: 'ពេញមួយជីវិត (Lifetime)'
      };
    },

    /**
     * Activate the application with a valid License Key
     */
    activate(key) {
      const mid = this.getMachineId();
      const res = this.verifyKey(key, mid);
      if (!res.valid) {
        return res;
      }

      const checksum = sha256(`${res.key}:${res.machineId}:${res.duration}:${LICENSE_SECRET}`);
      const payload = {
        key: res.key,
        machineId: res.machineId,
        duration: res.duration,
        expiryFormatted: res.expiryFormatted,
        activatedAt: new Date().toISOString(),
        lastCheckedDate: new Date().toISOString().slice(0, 10),
        checksum
      };

      try {
        localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(payload));
      } catch (e) {
        return { valid: false, reason: 'មិនអាចរក្សាទុកក្នុងកុំព្យូទ័របាន (Storage error)!' };
      }

      return { valid: true, payload };
    },

    /**
     * Unlock instantly using Master Developer Password
     */
    unlockWithMaster(password) {
      if (!password || !MASTER_PASSWORDS.includes(password.trim())) {
        return { valid: false, reason: 'លេខកូដមេមិនត្រឹមត្រូវ!' };
      }
      const mid = this.getMachineId();
      const masterKey = this.generateKey(mid, 'LIFE');
      return this.activate(masterKey);
    },

    /**
     * Reset / Remove License from this device
     */
    deactivate() {
      try {
        localStorage.removeItem(STORAGE_KEY_LICENSE);
      } catch (e) {}
    },

    /**
     * Initialize lock screen UI check
     */
    initUI() {
      const status = this.getStatus();
      const lockOverlay = document.getElementById('license-lock-screen');
      const appContainer = document.querySelector('.app-container');

      if (!status.isActivated) {
        if (lockOverlay) {
          lockOverlay.style.display = 'flex';
          const midEl = document.getElementById('lock-machine-id');
          if (midEl) midEl.textContent = status.machineId;

          const errorBox = document.getElementById('lock-error-msg');
          if (errorBox) {
            if (status.isExpired) {
              errorBox.textContent = `⚠️ ${status.reason} សូមទាក់ទងម្ចាស់កម្មវិធីដើម្បីបន្តសុពលភាពថ្មី។`;
              errorBox.style.display = 'block';
            } else if (status.isClockTampered) {
              errorBox.textContent = `⚠️ ${status.reason} សូមពិនិត្យកាលបរិច្ឆេទកុំព្យូទ័រឡើងវិញ។`;
              errorBox.style.display = 'block';
            } else {
              errorBox.style.display = 'none';
            }
          }
        }
        if (appContainer) {
          appContainer.style.filter = 'blur(12px)';
          appContainer.style.pointerEvents = 'none';
          appContainer.setAttribute('inert', '');
        }
      } else {
        if (lockOverlay) lockOverlay.style.display = 'none';
        if (appContainer) {
          appContainer.style.filter = 'none';
          appContainer.style.pointerEvents = 'auto';
          appContainer.removeAttribute('inert');
        }
      }

      this.updateSettingsTabUI();
    },

    /**
     * Update the License status in the Settings tab
     */
    updateSettingsTabUI() {
      const status = this.getStatus();
      const statusBadge = document.getElementById('settings-license-badge');
      const expiryText = document.getElementById('settings-license-expiry');
      const midText = document.getElementById('settings-license-mid');
      const keyText = document.getElementById('settings-license-key');

      if (statusBadge) {
        if (status.isActivated) {
          statusBadge.className = 'badge badge-success';
          statusBadge.innerHTML = '🟢 ដំណើរការស្របច្បាប់ (Active)';
        } else {
          statusBadge.className = 'badge badge-danger';
          statusBadge.innerHTML = '🔴 មិនទាន់ធ្វើឱ្យសកម្ម (Locked)';
        }
      }
      if (midText) midText.textContent = status.machineId;
      if (expiryText) {
        if (status.isActivated) {
          if (status.isLifetime) {
            expiryText.textContent = 'ពេញមួយជីវិត (គ្មានថ្ងៃផុតកំណត់)';
          } else {
            expiryText.textContent = `${status.expiryFormatted} (នៅសល់ ${status.daysLeft} ថ្ងៃ)`;
          }
        } else {
          expiryText.textContent = 'គ្មាន';
        }
      }
      if (keyText) keyText.textContent = status.key || 'មិនមាន';
    }
  };

  // Expose to window
  window.License = License;

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    License.initUI();

    // Setup event listeners for Lock Screen
    const btnActivate = document.getElementById('btn-lock-activate');
    const inputKey = document.getElementById('input-lock-key');
    const btnCopyMid = document.getElementById('btn-lock-copy-mid');
    const btnDevUnlock = document.getElementById('btn-lock-dev-unlock');

    if (btnCopyMid) {
      btnCopyMid.addEventListener('click', () => {
        const mid = License.getMachineId();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(mid).then(() => {
            btnCopyMid.textContent = '✅ បានចម្លង!';
            setTimeout(() => { btnCopyMid.textContent = '📋 ចម្លងកូដ'; }, 2000);
          }).catch(() => {
            prompt('សូមចម្លងកូដម៉ាស៊ីន (Machine ID) នេះ៖', mid);
          });
        } else {
          prompt('សូមចម្លងកូដម៉ាស៊ីន (Machine ID) នេះ៖', mid);
        }
      });
    }

    if (btnActivate && inputKey) {
      const doActivate = () => {
        const key = inputKey.value.trim();
        const errBox = document.getElementById('lock-error-msg');
        const res = License.activate(key);
        if (res.valid) {
          alert('🎉 ជោគជ័យ! កម្មវិធីត្រូវបានធ្វើឱ្យដំណើរការស្របច្បាប់។ សូមអរគុណ!');
          License.initUI();
          if (window.App && typeof window.App.renderCurrentView === 'function') {
            window.App.renderCurrentView();
          }
        } else {
          if (errBox) {
            errBox.textContent = `❌ ${res.reason}`;
            errBox.style.display = 'block';
          } else {
            alert(res.reason);
          }
        }
      };

      btnActivate.addEventListener('click', doActivate);
      inputKey.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doActivate();
      });
    }

    if (btnDevUnlock) {
      btnDevUnlock.addEventListener('click', (e) => {
        e.preventDefault();
        const pwd = prompt('សូមបញ្ចូលលេខកូដសម្ងាត់អ្នកបង្កើត (Master Developer Password) ៖');
        if (pwd) {
          const res = License.unlockWithMaster(pwd);
          if (res.valid) {
            alert('🔓 ជោគជ័យ! បានដោះសោរដោយលេខកូដមេជាស្ថាពរ (Lifetime License Activated)។');
            License.initUI();
            if (window.App && typeof window.App.renderCurrentView === 'function') {
              window.App.renderCurrentView();
            }
          } else {
            alert('❌ ' + res.reason);
          }
        }
      });
    }
  });

})(window);
