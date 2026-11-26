/**
 * Digital Gradebook & Academic Management System
 * Over-The-Air (OTA) Auto-Updater & Cloud Sync Engine
 * ប្រព័ន្ធពិនិត្យ និងទាញយកការអាប់ដេតស្វ័យប្រវត្តិតាមអ៊ីនធឺណិត
 */

(function (window) {
  'use strict';

  // Current Built-in Version of this package
  const BUILTIN_VERSION = '20.52';

  // Default GitHub / Cloud manifest URL (Configured for hakneng/Glass-Management)
  const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/hakneng/Glass-Management/main/version.json';
  const STORAGE_KEY_URL = 'glass_updater_manifest_url';
  const STORAGE_KEY_AUTO = 'glass_updater_auto_enabled';

  // IndexedDB Configuration for storing updated scripts and styles without size limits
  const DB_NAME = 'GlassUpdaterDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_updates';

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        return resolve(null);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function getCachedUpdate() {
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get('latest_update');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }
    } catch (e) {}

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('glass_sys_cached_update');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function saveCachedUpdate(updateData) {
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(updateData, 'latest_update');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      }
    } catch (e) {}

    // Fallback to localStorage
    try {
      localStorage.setItem('glass_sys_cached_update', JSON.stringify(updateData));
      return true;
    } catch (e) {
      return false;
    }
  }

  async function clearCachedUpdate() {
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete('latest_update');
      }
    } catch (e) {}
    try {
      localStorage.removeItem('glass_sys_cached_update');
    } catch (e) {}
  }

  /**
   * Helper to compare semantic versions: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const parts1 = String(v1).replace(/[^0-9.]/g, '').split('.').map(Number);
    const parts2 = String(v2).replace(/[^0-9.]/g, '').split('.').map(Number);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  const Updater = {
    builtinVersion: BUILTIN_VERSION,
    activeVersion: BUILTIN_VERSION,
    isChecking: false,
    updateAvailable: false,

    getManifestUrl() {
      try {
        return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_MANIFEST_URL;
      } catch (e) {
        return DEFAULT_MANIFEST_URL;
      }
    },

    setManifestUrl(url) {
      try {
        localStorage.setItem(STORAGE_KEY_URL, (url || '').trim());
      } catch (e) {}
    },

    isAutoUpdateEnabled() {
      try {
        const val = localStorage.getItem(STORAGE_KEY_AUTO);
        return val !== 'false'; // Enabled by default
      } catch (e) {
        return true;
      }
    },

    setAutoUpdateEnabled(enabled) {
      try {
        localStorage.setItem(STORAGE_KEY_AUTO, enabled ? 'true' : 'false');
      } catch (e) {}
    },

    /**
     * Check if a newer version is already cached in local database
     * Called before rendering to apply updated CSS or scripts
     */
    async applyCachedUpdatesIfAny() {
      const cached = await getCachedUpdate();
      if (cached && cached.version && compareVersions(cached.version, BUILTIN_VERSION) > 0) {
        this.activeVersion = cached.version;

        // Apply updated CSS styles
        if (cached.stylesCss) {
          let styleEl = document.getElementById('ota-cached-styles');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'ota-cached-styles';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = cached.stylesCss;
        }

        console.log(`[AutoUpdater] 🟢 Running updated version v${cached.version} from offline cache!`);
      } else {
        this.activeVersion = BUILTIN_VERSION;
      }
      this.updateSettingsUI();
    },

    /**
     * Check remote manifest for new versions
     */
    async checkForUpdates(isManual = false) {
      if (this.isChecking) return;
      if (!navigator.onLine && !isManual) {
        console.log('[AutoUpdater] ⚪ Device is offline, skipping cloud check.');
        return;
      }

      const manifestUrl = this.getManifestUrl();
      if (!manifestUrl) {
        if (isManual) {
          alert('ℹ️ សូមកំណត់តំណភ្ជាប់ GitHub ឬ Cloud URL របស់លោកអ្នកនៅក្នុង «ផ្ទាំងកំណត់ (Settings)» ជាមុនសិន!');
        }
        return;
      }

      this.isChecking = true;
      this.updateStatusBadge('checking');

      try {
        // Fetch version.json with 3.5s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const cacheBuster = `?t=${Date.now()}`;
        const res = await fetch(manifestUrl + cacheBuster, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}`);
        }

        const manifest = await res.json();
        const remoteVersion = manifest.version;

        if (compareVersions(remoteVersion, this.activeVersion) > 0) {
          console.log(`[AutoUpdater] 🚀 New version found! v${this.activeVersion} -> v${remoteVersion}`);
          this.updateAvailable = true;
          this.showUpdateBanner(manifest);
          this.updateStatusBadge('available', remoteVersion);
          
          // Download assets in background automatically
          await this.downloadAndCacheUpdate(manifest);
        } else {
          console.log(`[AutoUpdater] ✅ System is up to date (v${this.activeVersion}).`);
          this.updateStatusBadge('up-to-date');
          if (isManual) {
            alert(`✅ កម្មវិធីរបស់លោកអ្នកជាជំនាន់ចុងក្រោយបង្អស់ហើយ (v${this.activeVersion})! មិនមានកំណែអាប់ដេតថ្មីទេ។`);
          }
        }
      } catch (err) {
        console.warn('[AutoUpdater] Update check failed or timed out:', err.message);
        this.updateStatusBadge('error');
        if (isManual) {
          alert(`⚠️ មិនអាចពិនិត្យការអាប់ដេតបានទេ៖ ${err.message}\nសូមពិនិត្យការភ្ជាប់អ៊ីនធឺណិត ឬតំណភ្ជាប់ URL ឡើងវិញ។`);
        }
      } finally {
        this.isChecking = false;
      }
    },

    /**
     * Download the latest JS and CSS files and cache them in IndexedDB/localStorage
     */
    async downloadAndCacheUpdate(manifest) {
      try {
        const appJsUrl = manifest.appJsUrl || manifest.files?.appJs;
        const stylesCssUrl = manifest.stylesCssUrl || manifest.files?.stylesCss;
        const manifestUrl = this.getManifestUrl();

        if (!appJsUrl && !stylesCssUrl) return;

        console.log('[AutoUpdater] 📥 Downloading updated files in background...');
        
        let newJs = null;
        let newCss = null;

        if (stylesCssUrl) {
          let cssRes = await fetch(stylesCssUrl + `?t=${Date.now()}`);
          if (cssRes.ok) {
            newCss = await cssRes.text();
          } else if (manifestUrl) {
            // Fallback: try root styles.css
            const fallbackCss = manifestUrl.replace(/version\.json.*$/, 'styles.css');
            const fbRes = await fetch(fallbackCss + `?t=${Date.now()}`);
            if (fbRes.ok) newCss = await fbRes.text();
          }
        }

        if (appJsUrl) {
          let jsRes = await fetch(appJsUrl + `?t=${Date.now()}`);
          if (jsRes.ok) {
            newJs = await jsRes.text();
          } else if (manifestUrl) {
            // Fallback: try root app.js in case user dropped it in root
            const fallbackJs = manifestUrl.replace(/version\.json.*$/, 'app.js');
            const fbRes = await fetch(fallbackJs + `?t=${Date.now()}`);
            if (fbRes.ok) newJs = await fbRes.text();
          }
        }

        if (!newJs && !newCss) {
          console.warn('[AutoUpdater] ⚠️ Could not fetch app.js or styles.css from server (404 Not Found). Files might not be uploaded yet.');
          return;
        }

        const payload = {
          version: manifest.version,
          releaseDate: manifest.releaseDate || new Date().toISOString().slice(0, 10),
          title: manifest.title || `ជំនាន់ v${manifest.version}`,
          changelog: manifest.changelog || 'កែលម្អប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ',
          stylesCss: newCss,
          appJs: newJs,
          downloadedAt: new Date().toISOString()
        };

        await saveCachedUpdate(payload);
        console.log(`[AutoUpdater] 💾 Successfully cached update v${manifest.version} for offline use!`);

        // Notify user that the update is ready to activate
        this.showUpdateReadyNotification(manifest.version);
      } catch (err) {
        console.error('[AutoUpdater] Failed to download update assets:', err);
      }
    },

    /**
     * Display the modern Update Banner at top of screen
     */
    showUpdateBanner(manifest) {
      let banner = document.getElementById('ota-update-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'ota-update-banner';
        banner.className = 'ota-update-banner';
        document.body.prepend(banner);
      }

      banner.innerHTML = `
        <div class="ota-banner-content">
          <div class="ota-banner-text">
            <strong>🎉 មានកំណែអាប់ដេតថ្មី v${manifest.version} (${manifest.releaseDate || 'ថ្មី'})</strong>
            <span>៖ ${manifest.changelog || 'កែលម្អទម្រង់ និងបន្ថែមមុខងារថ្មី'}</span>
          </div>
          <div class="ota-banner-actions">
            <button type="button" id="btn-ota-reload-now" class="btn-ota-reload">
              🔄 ដំណើរការកូដថ្មី (Reload Now)
            </button>
            <button type="button" id="btn-ota-dismiss" class="btn-ota-dismiss" title="បិទ">✕</button>
          </div>
        </div>
      `;

      banner.style.display = 'block';

      document.getElementById('btn-ota-reload-now')?.addEventListener('click', () => {
        window.location.reload();
      });

      document.getElementById('btn-ota-dismiss')?.addEventListener('click', () => {
        banner.style.display = 'none';
      });
    },

    showUpdateReadyNotification(newVersion) {
      const banner = document.getElementById('ota-update-banner');
      if (banner) {
        const textEl = banner.querySelector('.ota-banner-text');
        if (textEl) {
          textEl.innerHTML = `<strong>✅ បានទាញយកកំណែ v${newVersion} រួចរាល់!</strong> <span>សូមចុច «Reload Now» ដើម្បីចាប់ផ្តើមប្រើប្រាស់ភ្លាមៗ។</span>`;
        }
      }
    },

    /**
     * Update UI in Settings Tab
     */
    updateSettingsUI() {
      if (typeof document === 'undefined' || !document.getElementById) return;
      const verEl = document.getElementById('settings-updater-version');
      const statusEl = document.getElementById('settings-updater-status');
      const urlInput = document.getElementById('settings-updater-url');
      const autoCheck = document.getElementById('settings-updater-auto');

      if (verEl) verEl.textContent = `v${this.activeVersion}` + (this.activeVersion !== BUILTIN_VERSION ? ' (Cached Update)' : ' (Built-in)');
      if (urlInput && !urlInput.value) urlInput.value = this.getManifestUrl();
      if (autoCheck) autoCheck.checked = this.isAutoUpdateEnabled();
      if (statusEl && !statusEl.textContent.trim()) {
        statusEl.className = navigator.onLine ? 'badge badge-success' : 'badge badge-secondary';
        statusEl.textContent = navigator.onLine ? '🟢 ភ្ជាប់អ៊ីនធឺណិត (Online)' : '⚪ ក្រៅបណ្តាញ (Offline)';
      }
    },

    updateStatusBadge(state, version = '') {
      if (typeof document === 'undefined' || !document.getElementById) return;
      const statusEl = document.getElementById('settings-updater-status');
      if (!statusEl) return;
      if (state === 'checking') {
        statusEl.className = 'badge badge-warning';
        statusEl.textContent = '⏳ កំពុងពិនិត្យ...';
      } else if (state === 'available') {
        statusEl.className = 'badge badge-primary';
        statusEl.textContent = `🔔 មានកំណែថ្មី v${version}!`;
      } else if (state === 'up-to-date') {
        statusEl.className = 'badge badge-success';
        statusEl.textContent = '✅ ជំនាន់ចុងក្រោយ';
      } else if (state === 'error') {
        statusEl.className = 'badge badge-danger';
        statusEl.textContent = '⚠️ មិនអាចភ្ជាប់បាន';
      }
    },

    /**
     * Reset cached updates and revert to built-in files
     */
    async resetCache() {
      if (confirm('តើលោកអ្នកចង់សម្អាត Cache និងត្រឡប់ទៅប្រើប្រាស់ឯកសារជំនាន់ដើម (v' + BUILTIN_VERSION + ') វិញឬទេ?')) {
        await clearCachedUpdate();
        alert('✅ បានសម្អាតរួចរាល់! កម្មវិធីនឹងដំណើរការឡើងវិញ។');
        window.location.reload();
      }
    }
  };

  // Expose to window
  window.Updater = Updater;

  // Immediately apply any cached update before main app runs
  Updater.applyCachedUpdatesIfAny();

  // Background auto-check on DOMContentLoaded if enabled
  document.addEventListener('DOMContentLoaded', () => {
    Updater.updateSettingsUI();

    if (Updater.isAutoUpdateEnabled()) {
      // Delay check slightly (1.5s) so the app renders first without any delay
      setTimeout(() => {
        Updater.checkForUpdates(false);
      }, 1500);
    }

    // Settings Tab event listeners
    const btnCheck = document.getElementById('btn-settings-check-update');
    if (btnCheck) {
      btnCheck.addEventListener('click', () => {
        Updater.checkForUpdates(true);
      });
    }

    const btnSaveUrl = document.getElementById('btn-settings-save-updater-url');
    if (btnSaveUrl) {
      btnSaveUrl.addEventListener('click', () => {
        const input = document.getElementById('settings-updater-url');
        if (input) {
          Updater.setManifestUrl(input.value);
          alert('✅ បានរក្សាទុកតំណភ្ជាប់ Update URL រួចរាល់!');
        }
      });
    }

    const autoToggle = document.getElementById('settings-updater-auto');
    if (autoToggle) {
      autoToggle.addEventListener('change', () => {
        Updater.setAutoUpdateEnabled(autoToggle.checked);
      });
    }

    const btnResetCache = document.getElementById('btn-settings-reset-cache');
    if (btnResetCache) {
      btnResetCache.addEventListener('click', () => {
        Updater.resetCache();
      });
    }
  });

})(window);
