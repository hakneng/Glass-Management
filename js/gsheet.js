/**
 * =========================================================
 * GOOGLE SHEETS LIVE SYNC MODULE (ប្រព័ន្ធភ្ជាប់ និងទាញទិន្នន័យពី Google Sheets)
 * =========================================================
 */
const GSheetSync = {
  STORAGE_KEY_URL: 'school_management_gsheet_url',
  STORAGE_KEY_LAST_TYPE: 'school_management_gsheet_last_type',
  DEFAULT_MASTER_URL: 'https://docs.google.com/spreadsheets/d/1u26uPGwUiXzIrDDmyaDBHwDyvKBqcrRDXnlTk-uZKVI/edit',

  init() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    this.bindEvents();
    console.log('Google Sheets Live Sync initialized.');
  },

  bindEvents() {
    // 0. Class select change in modal
    const classSelect = document.getElementById('gsheet-sync-class-select');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        const newClassId = e.target.value;
        if (window.App && typeof App.switchToClass === 'function') {
          App.switchToClass(newClassId);
        }
        // Load URL for newly selected class
        const inputUrl = document.getElementById('gsheet-sync-url');
        if (inputUrl) {
          const classUrl = localStorage.getItem('school_management_gsheet_url_' + newClassId) 
            || localStorage.getItem(this.STORAGE_KEY_URL) 
            || this.DEFAULT_MASTER_URL;
          inputUrl.value = classUrl;
        }
        this.populateMonthsDropdown();
        this.hideStatus();
      });
    }

    // 1. Open modal from toolbar buttons
    const btnScores = document.getElementById('btn-sync-scores-gsheet');
    if (btnScores) {
      btnScores.addEventListener('click', () => this.openModal('scores'));
    }

    const btnAtt = document.getElementById('btn-sync-attendance-gsheet');
    if (btnAtt) {
      btnAtt.addEventListener('click', () => this.openModal('attendance'));
    }

    const btnStudents = document.getElementById('btn-sync-students-gsheet');
    if (btnStudents) {
      btnStudents.addEventListener('click', () => this.openModal('students'));
    }

    // 2. Close & Cancel Modal
    const btnClose = document.getElementById('modal-gsheet-close');
    const btnCancel = document.getElementById('modal-gsheet-cancel');
    const modal = document.getElementById('modal-google-sheets-sync');
    if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
    if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    // 3. Paste URL from clipboard
    const btnPaste = document.getElementById('btn-gsheet-paste-url');
    if (btnPaste) {
      btnPaste.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          const input = document.getElementById('gsheet-sync-url');
          if (input && text) {
            input.value = text.trim();
            this.showStatus('📋 បានបិទភ្ជាប់តំណភ្ជាប់ដោយជោគជ័យ!', 'info');
          }
        } catch (err) {
          const input = document.getElementById('gsheet-sync-url');
          if (input) {
            input.focus();
            input.select();
          }
          alert('សូមចុចបញ្ជា Ctrl + V ក្នុងប្រអប់ដើម្បីបិទភ្ជាប់តំណភ្ជាប់ Google Sheet');
        }
      });
    }

    // 4. Radio change for sync type
    const radios = document.querySelectorAll('input[name="gsheet-sync-type"]');
    radios.forEach(r => {
      r.addEventListener('change', (e) => {
        this.toggleMonthSelector(e.target.value);
      });
    });

    // 5. Execute Sync
    const btnDoSync = document.getElementById('btn-gsheet-do-sync');
    if (btnDoSync) {
      btnDoSync.addEventListener('click', () => this.executeSync());
    }

    // 6. Template download button
    const btnTemplate = document.getElementById('btn-gsheet-open-template');
    if (btnTemplate) {
      btnTemplate.addEventListener('click', () => {
        const type = document.querySelector('input[name="gsheet-sync-type"]:checked')?.value || 'scores';
        if (type === 'scores') {
          document.getElementById('btn-template-scores-excel')?.click();
        } else if (type === 'attendance') {
          document.getElementById('btn-template-attendance-excel')?.click();
        } else {
          document.getElementById('btn-template-excel')?.click();
        }
      });
    }
  },

  openModal(preferredType = 'scores') {
    const modal = document.getElementById('modal-google-sheets-sync');
    if (!modal) return;

    // Populate classes dropdown
    this.populateClassesDropdown();

    // Load saved URL for current class from localStorage
    const currentClassId = (window.App && App.state && App.state.currentClassId) || 'default';
    const savedUrl = localStorage.getItem('school_management_gsheet_url_' + currentClassId) 
      || localStorage.getItem(this.STORAGE_KEY_URL) 
      || this.DEFAULT_MASTER_URL;
    const inputUrl = document.getElementById('gsheet-sync-url');
    if (inputUrl) {
      inputUrl.value = savedUrl;
    }

    // Set selected type
    const radio = document.querySelector(`input[name="gsheet-sync-type"][value="${preferredType}"]`);
    if (radio) {
      radio.checked = true;
    }
    this.toggleMonthSelector(preferredType);

    // Populate months dropdown
    this.populateMonthsDropdown();

    // Reset status
    this.hideStatus();

    modal.style.display = 'flex';
  },

  populateClassesDropdown() {
    const select = document.getElementById('gsheet-sync-class-select');
    if (!select || !window.App || !App.state || !Array.isArray(App.state.classes)) return;

    select.innerHTML = '';
    const currentClassId = App.state.currentClassId || '';

    App.state.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const count = Array.isArray(c.students) ? c.students.length : 0;
      const track = c.track ? ` (${c.track})` : '';
      opt.textContent = `ថ្នាក់ទី ${c.name || c.id}${track} - សិស្ស ${count} នាក់`;
      if (c.id === currentClassId) opt.selected = true;
      select.appendChild(opt);
    });
  },

  closeModal() {
    const modal = document.getElementById('modal-google-sheets-sync');
    if (modal) modal.style.display = 'none';
  },

  populateMonthsDropdown() {
    const select = document.getElementById('gsheet-sync-month');
    if (!select || !window.App || !App.state || !App.state.months) return;

    select.innerHTML = '';
    const currentMId = App.currentMonthId || 'month_11';

    // Current month option
    App.state.months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === currentMId) opt.selected = true;
      select.appendChild(opt);
    });

    // All months option
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = '🌟 គ្រប់ខែទាំងអស់ (Sync All Months)';
    select.appendChild(optAll);
  },

  toggleMonthSelector(type) {
    const group = document.getElementById('gsheet-month-selector-group');
    if (group) {
      group.style.display = (type === 'scores' || type === 'attendance') ? 'flex' : 'none';
    }
  },

  parseUrl(rawUrl) {
    rawUrl = (rawUrl || '').trim();
    if (!rawUrl) return null;

    // Case 1: Published web link
    if (rawUrl.includes('/pubhtml') || rawUrl.includes('/pub?')) {
      let csv = rawUrl.replace('/pubhtml', '/pub?output=csv');
      let xlsx = rawUrl.replace('/pubhtml', '/pub?output=xlsx');
      if (rawUrl.includes('output=')) {
        csv = rawUrl.replace(/output=[^&]+/, 'output=csv');
        xlsx = rawUrl.replace(/output=[^&]+/, 'output=xlsx');
      }
      return { isPublished: true, csvUrl: csv, xlsxUrl: xlsx, sheetId: null, gid: '0' };
    }

    // Case 2: Extract ID from any Google Spreadsheet or Google Drive link
    let isDriveFile = false;
    let sheetId = null;
    const gsheetMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gdriveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    const gopenMatch = rawUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);

    if (gsheetMatch) {
      sheetId = gsheetMatch[1];
    } else if (gdriveMatch) {
      sheetId = gdriveMatch[1];
      isDriveFile = true;
    } else if (gopenMatch) {
      sheetId = gopenMatch[1];
      if (rawUrl.includes('drive.google.com')) {
        isDriveFile = true;
      }
    }

    if (sheetId) {
      let gid = '0';
      const gidMatch = rawUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) gid = gidMatch[1];

      return {
        sheetId,
        gid,
        isDriveFile,
        xlsxUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
        csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
        ucUrl: `https://drive.google.com/uc?export=download&id=${sheetId}`
      };
    }

    return null;
  },

  fetchGvizJsonp(sheetId, queryParams = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'gviz_cb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      let isSettled = false;

      // Timeout safety: 12 seconds
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('TIMEOUT'));
      }, 12000);

      function cleanup() {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[callbackName] = function(response) {
        cleanup();
        if (!response) {
          reject(new Error('EMPTY_RESPONSE'));
          return;
        }
        if (response.status === 'error') {
          const errMsg = (response.errors && response.errors[0])
            ? (response.errors[0].detailed_message || response.errors[0].message || 'GViz error')
            : 'GViz error';
          reject(new Error(errMsg));
          return;
        }
        if (!response.table) {
          reject(new Error('NO_TABLE'));
          return;
        }
        // Preserve signature from GViz response on table object
        response.table.sig = response.sig || '';
        response.table.reqId = response.reqId || '';
        resolve(response.table);
      };

      const script = document.createElement('script');
      let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}`;
      if (queryParams.sheet) {
        url += `&sheet=${encodeURIComponent(queryParams.sheet)}`;
      }
      if (queryParams.gid !== undefined && queryParams.gid !== null) {
        url += `&gid=${encodeURIComponent(queryParams.gid)}`;
      }
      if (queryParams.range) {
        url += `&range=${encodeURIComponent(queryParams.range)}`;
      }

      script.src = url;
      script.onerror = function() {
        cleanup();
        reject(new Error('RESTRICTED'));
      };

      document.head.appendChild(script);
    });
  },

  convertGvizTableToRows(table) {
    if (!table || !table.rows) return [];
    const colCount = (table.cols && table.cols.length) || 0;
    const colLabels = (table.cols || []).map(c => (c && c.label !== undefined && c.label !== null) ? String(c.label).trim() : '');
    const hasLabels = colLabels.some(l => l.length > 0);

    const rows = [];
    if (hasLabels) {
      rows.push(colLabels);
    }

    for (let r = 0; r < table.rows.length; r++) {
      const rowObj = table.rows[r];
      if (!rowObj || !rowObj.c) {
        rows.push(new Array(colCount).fill(''));
        continue;
      }
      const rowArr = [];
      const cells = rowObj.c || [];
      const len = Math.max(colCount, cells.length);
      for (let c = 0; c < len; c++) {
        const cell = cells[c];
        if (!cell || cell.v === null || cell.v === undefined) {
          rowArr.push('');
        } else if (typeof cell.v === 'number') {
          rowArr.push(cell.v);
        } else if (cell.f !== undefined && cell.f !== null && String(cell.v).startsWith('Date(')) {
          rowArr.push(cell.f);
        } else if (cell.f !== undefined && cell.f !== null) {
          rowArr.push(cell.f);
        } else {
          rowArr.push(String(cell.v));
        }
      }
      rows.push(rowArr);
    }
    return rows;
  },

  async fetchWorkbook(urlInfo, syncOptions = {}) {
    if (urlInfo.isDriveFile) {
      throw new Error('DRIVE_FILE');
    }

    // METHOD 1: Google Visualization API (JSONP) - Direct, fast, immune to browser CORS
    if (urlInfo.sheetId && typeof document !== 'undefined') {
      try {
        const type = syncOptions.type || 'scores';
        const targetMonth = syncOptions.targetMonth || (App.currentMonthId || 'month_11');

        const monthMap = {
          'month_11': 'វិច្ឆិកា',
          'month_12': 'ធ្នូ',
          'month_01': 'មករា',
          'month_02': 'កុម្ភៈ',
          'month_03': 'មីនា',
          'month_04': 'មេសា',
          'month_05': 'ឧសភា',
          'month_06': 'មិថុនា',
          'month_07': 'កក្កដា',
          'month_08': 'សីហា',
          'month_09': 'កញ្ញា',
          'month_10': 'តុលា',
          'sem_1': 'ឆមាស១',
          'sem_2': 'ឆមាស២'
        };

        const parsed = {
          sheetNames: [],
          sheets: {},
          rawSheets: {}
        };

        // 1. Fetch default sheet or gid specified in URL
        const defaultTable = await this.fetchGvizJsonp(urlInfo.sheetId, { gid: urlInfo.gid || 0 });
        const defaultRows = this.convertGvizTableToRows(defaultTable);
        const defaultSig = defaultTable.sig || '';

        const isDefaultSheetFallback = (tabRows, tabSig) => {
          if (tabSig && defaultSig && tabSig === defaultSig) return true;
          if (tabRows && tabRows.length > 0 && defaultRows && defaultRows.length > 0) {
            const r0 = String(tabRows[0] ? tabRows[0][0] : '').trim();
            const d0 = String(defaultRows[0] ? defaultRows[0][0] : '').trim();
            if (r0 && d0 && r0 === d0) return true;
          }
          return false;
        };

        parsed.sheetNames.push('Default');
        parsed.sheets['Default'] = defaultRows;
        parsed.rawSheets['Default'] = defaultRows;

        // 2. Fetch candidate named tabs
        let candidateNames = [];
        const currentMonthName = monthMap[targetMonth] || '';
        const classTokens = this.getClassTokens();

        // Build list of candidate class names
        const classNamesSet = new Set();
        
        // A. Priority: active selected class from dropdown or state
        const classSelect = document.getElementById('gsheet-sync-class-select');
        const activeClassId = (classSelect && classSelect.value) || (window.App && App.state && App.state.currentClassId) || '';
        const curClass = (window.App && App.state && Array.isArray(App.state.classes))
          ? App.state.classes.find(c => c.id === activeClassId)
          : null;

        if (curClass && curClass.name) {
          const raw = curClass.name.trim();
          classNamesSet.add(raw);
          classNamesSet.add(raw.toUpperCase());
          const stripped = raw.replace(/ថ្នាក់ទី|ថ្នាក់|grade|class/gi, '').trim();
          if (stripped) {
            classNamesSet.add(stripped);
            classNamesSet.add(stripped.toUpperCase());
          }
        }

        classTokens.forEach(ct => {
          if (ct && ct.length >= 2) {
            classNamesSet.add(ct);
            classNamesSet.add(ct.toUpperCase());
          }
        });

        // B. Master sheet class names
        ['12A', '7F', '11F', '12B', '10A', '9A', '8A', '១២A', '៧F', '១១F', '១២B', '១០A', '៩A', '៨A'].forEach(c => classNamesSet.add(c));

        // C. All classes in App.state.classes
        if (window.App && App.state && Array.isArray(App.state.classes)) {
          App.state.classes.forEach(c => {
            if (c.name) {
              classNamesSet.add(c.name.trim());
              const stripped = c.name.replace(/ថ្នាក់ទី|ថ្នាក់|grade|class/gi, '').trim();
              if (stripped) classNamesSet.add(stripped);
            }
          });
        }

        const classList = Array.from(classNamesSet);

        if (type === 'scores') {
          // 1. Class + Month (e.g. 11F_វិច្ឆិកា, 11F-វិច្ឆិកា)
          if (currentMonthName) {
            classList.forEach(cls => {
              candidateNames.push(`${cls}_${currentMonthName}`);
              candidateNames.push(`${cls}-${currentMonthName}`);
            });
          }
          if (targetMonth === 'sem_1') {
            classList.forEach(cls => {
              candidateNames.push(`${cls}_ឆមាស១`, `${cls}_ឆ.១`, `${cls}_ប្រឡងឆមាសទី១`, `${cls}_ឆមាសទី១`);
            });
            candidateNames.push('ឆមាស១', 'ឆ.១', 'ប្រឡងឆមាសទី១', 'ឆមាសទី១', 'Sem1', 'Semester 1');
          } else if (targetMonth === 'sem_2') {
            classList.forEach(cls => {
              candidateNames.push(`${cls}_ឆមាស២`, `${cls}_ឆ.២`, `${cls}_ប្រឡងឆមាសទី២`, `${cls}_ឆមាសទី២`);
            });
            candidateNames.push('ឆមាស២', 'ឆ.២', 'ប្រឡងឆមាសទី២', 'ឆមាសទី២', 'Sem2', 'Semester 2');
          }
          // 2. Class alone (e.g. 11F, 12A, 7F in Master Sheet)
          classList.forEach(cls => {
            candidateNames.push(cls);
          });
          // 3. Month alone
          if (targetMonth === 'all') {
            Object.values(monthMap).forEach(m => candidateNames.push(m));
          } else if (currentMonthName) {
            candidateNames.push(currentMonthName);
          }
        } else if (type === 'attendance') {
          classList.forEach(cls => {
            candidateNames.push(`${cls}_វត្តមាន`);
            candidateNames.push(cls);
          });
          candidateNames.push('វត្តមាន', 'វត្តមានសិស្ស', 'Attendance');
        } else if (type === 'students') {
          classList.forEach(cls => {
            candidateNames.push(`${cls}_បញ្ជីសិស្ស`);
            candidateNames.push(cls);
          });
          candidateNames.push('បញ្ជីសិស្ស', 'ឈ្មោះសិស្ស', 'សិស្ស', 'Students');
        }

        // Deduplicate while preserving priority order
        candidateNames = Array.from(new Set(candidateNames));

        if (candidateNames.length > 0) {
          const tabFetches = candidateNames.map(async (name) => {
            try {
              const table = await this.fetchGvizJsonp(urlInfo.sheetId, { sheet: name });
              if (table) {
                const rows = this.convertGvizTableToRows(table);
                // Ignore fallback to default sheet if candidateNames has multiple
                if (isDefaultSheetFallback(rows, table.sig) && candidateNames.length > 1) {
                  return null;
                }
                return { name, rows };
              }
            } catch (e) {
              return null;
            }
          });

          const results = await Promise.all(tabFetches);
          results.forEach(res => {
            if (res && res.rows && res.rows.length > 0) {
              if (!parsed.sheetNames.includes(res.name)) {
                parsed.sheetNames.push(res.name);
              }
              parsed.sheets[res.name] = res.rows;
              parsed.rawSheets[res.name] = res.rows;
            }
          });
        }

        if (parsed.sheetNames.length > 0) {
          const nonDefault = parsed.sheetNames.filter(s => s !== 'Default');
          if (nonDefault.length > 0) {
            parsed.sheetNames = nonDefault;
          }
          return parsed;
        }
      } catch (gerr) {
        if (gerr.message === 'RESTRICTED') {
          throw gerr;
        }
        console.warn('Gviz JSONP fetch failed, trying fallbacks...', gerr);
      }
    }

    // METHOD 2: Direct or Proxy XLSX/CSV Export (Fallback if XLSX is available)
    if (typeof XLSX !== 'undefined') {
      const tryParseBuffer = (buffer) => {
        if (!buffer || buffer.byteLength < 200) return null;
        try {
          const u8 = new Uint8Array(buffer);
          const strCheck = String.fromCharCode(...u8.slice(0, 50)).toLowerCase();
          if (strCheck.includes('<html') || strCheck.includes('<!doctype') || strCheck.includes('sign in') || strCheck.includes('login')) {
            return 'RESTRICTED';
          }
          const wb = XLSX.read(u8, { type: 'array', cellDates: true });
          if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
            return this.convertWorkbook(wb);
          }
        } catch (e) {}
        return null;
      };

      const tryParseCsv = (text) => {
        if (!text || text.trim().length === 0) return null;
        const lower = text.slice(0, 200).toLowerCase();
        if (lower.includes('<html') || lower.includes('<!doctype') || lower.includes('sign in') || lower.includes('accounts.google.com')) {
          return 'RESTRICTED';
        }
        try {
          const wb = XLSX.read(text, { type: 'string' });
          if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
            return this.convertWorkbook(wb);
          }
        } catch (e) {}
        return null;
      };

      let sawRestricted = false;

      if (urlInfo.xlsxUrl) {
        try {
          const resp = await fetch(urlInfo.xlsxUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const parsed = tryParseBuffer(buf);
            if (parsed === 'RESTRICTED') sawRestricted = true;
            else if (parsed) return parsed;
          } else if (resp.status === 401 || resp.status === 403) {
            sawRestricted = true;
          }
        } catch (e) {}
      }

      if (urlInfo.csvUrl) {
        try {
          const resp = await fetch(urlInfo.csvUrl);
          if (resp.ok) {
            const text = await resp.text();
            const parsed = tryParseCsv(text);
            if (parsed === 'RESTRICTED') sawRestricted = true;
            else if (parsed) return parsed;
          } else if (resp.status === 401 || resp.status === 403) {
            sawRestricted = true;
          }
        } catch (e) {}
      }

      if (sawRestricted) {
        throw new Error('RESTRICTED');
      }
    }

    throw new Error('CANNOT_DOWNLOAD');
  },

  convertWorkbook(wb) {
    const result = {
      sheetNames: wb.SheetNames,
      sheets: {},
      rawSheets: {}
    };
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      result.sheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      result.rawSheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    });
    return result;
  },

  async executeSync() {
    const inputUrl = document.getElementById('gsheet-sync-url');
    const rawUrl = inputUrl ? inputUrl.value.trim() : '';

    if (!rawUrl) {
      this.showStatus('⚠️ សូមបញ្ចូលតំណភ្ជាប់ (Link) នៃ Google Sheet ជាមុនសិន!', 'error');
      if (inputUrl) inputUrl.focus();
      return;
    }

    const urlInfo = this.parseUrl(rawUrl);
    if (!urlInfo) {
      this.showStatus('⚠️ ទម្រង់តំណភ្ជាប់មិនត្រឹមត្រូវឡើយ! សូមប្រាកដថាជា Link នៃ Google Sheets (docs.google.com/spreadsheets/...)', 'error');
      return;
    }

    // Ensure active class matches the selected class in the modal
    const classSelect = document.getElementById('gsheet-sync-class-select');
    if (classSelect && classSelect.value) {
      const selectedClassId = classSelect.value;
      if (window.App && typeof App.switchToClass === 'function' && App.state && App.state.currentClassId !== selectedClassId) {
        App.switchToClass(selectedClassId);
      }
    }

    // Save URL to localStorage (both per-class and global)
    const currentClassId = (window.App && App.state && App.state.currentClassId) || 'default';
    const currentClassName = (window.App && App.state && App.state.schoolConfig && App.state.schoolConfig.className) 
      || (App.state && App.state.classes && App.state.classes.find(c => c.id === currentClassId)?.name) 
      || 'បច្ចុប្បន្ន';

    localStorage.setItem('school_management_gsheet_url_' + currentClassId, rawUrl);
    localStorage.setItem(this.STORAGE_KEY_URL, rawUrl);

    const type = document.querySelector('input[name="gsheet-sync-type"]:checked')?.value || 'scores';
    const monthSelect = document.getElementById('gsheet-sync-month');
    const targetMonth = monthSelect ? monthSelect.value : (App.currentMonthId || 'month_11');

    const btnSync = document.getElementById('btn-gsheet-do-sync');
    const originalText = btnSync ? btnSync.innerHTML : '';
    if (btnSync) {
      btnSync.disabled = true;
      btnSync.innerHTML = '<span>⏳ កំពុងទាញទិន្នន័យ...</span>';
    }

    this.showStatus(`⏳ កំពុងតភ្ជាប់ និងទាញទិន្នន័យសម្រាប់ <strong>ថ្នាក់ទី ${currentClassName}</strong>...`, 'loading');

    try {
      const parsed = await this.fetchWorkbook(urlInfo, { type, targetMonth });

      let resultMsg = '';
      if (type === 'scores') {
        resultMsg = this.syncScores(parsed, targetMonth);
      } else if (type === 'attendance') {
        resultMsg = this.syncAttendance(parsed, targetMonth);
      } else if (type === 'students') {
        resultMsg = this.syncStudents(parsed);
      }

      if (window.App && typeof App.syncCurrentClassData === 'function') {
        App.syncCurrentClassData();
      }
      if (window.App && typeof App.saveState === 'function') {
        App.saveState();
      }

      this.showStatus(`🎉 <strong>[ថ្នាក់ទី ${currentClassName}]</strong> ${resultMsg}`, 'success');

      if (window.App && typeof App.showToast === 'function') {
        App.showToast(`[ថ្នាក់ទី ${currentClassName}] ${resultMsg}`, 'success');
      }

      // Auto close after 2.8 seconds
      setTimeout(() => {
        this.closeModal();
      }, 2800);

    } catch (err) {
      console.error('Google Sheets Sync Error:', err);
      let errHtml = '';

      if (err.message === 'DRIVE_FILE') {
        errHtml = `
          <div style="text-align: left;">
            <div style="font-weight: 700; color: #b91c1c; font-size: 14px; margin-bottom: 6px;">
              📁 តំណភ្ជាប់នេះជាឯកសារក្នុង Google Drive មិនទាន់បើកជា Google Sheets ឡើយ!
            </div>
            <div style="color: #450a0a; line-height: 1.6; font-size: 12.5px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;">
              <strong>របៀបដោះស្រាយត្រឹមតែ ១០ វិនាទី ៖</strong><br>
              ១. ចូលទៅកាន់ Google Drive របស់អ្នក<br>
              ២. ចុចស្តាំ (Right-click) លើឯកសារនោះ 👉 ជ្រើសរើស <strong>«បើកជាមួយ Google សន្លឹកកិច្ចការ (Open with Google Sheets)»</strong><br>
              ៣. បន្ទាប់មកចម្លង Link ពីលើរបារអាសយដ្ឋាន (URL) របស់ Browser<br>
              ៤. យកមកបិទភ្ជាប់ (Paste) ក្នុងប្រអប់នេះ រួចចុច <strong>«Sync Now»</strong> ឡើងវិញ។
            </div>
          </div>
        `;
      } else if (err.message === 'RESTRICTED' || (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('401') || err.message.includes('403')))) {
        errHtml = `
          <div style="text-align: left;">
            <div style="font-weight: 700; color: #b91c1c; font-size: 14px; margin-bottom: 6px;">
              🔒 Google Sheet នេះជាប់សោរ (Restricted / Private)!
            </div>
            <div style="color: #450a0a; line-height: 1.6; font-size: 12.5px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;">
              <strong>របៀបដោះស្រាយត្រឹមតែ ១០ វិនាទី ៖</strong><br>
              ១. បើកឯកសារ Google Sheet នោះ<br>
              ២. ចុចប៊ូតុងពណ៌ខៀវ <strong>Share (ចែករំលែក)</strong> នៅជ្រុងខាងស្តាំលើ<br>
              ៣. ត្រង់ <em>General access</em> សូមប្តូរពី «Restricted» ទៅជា 👉 <strong>«Anyone with the link (អ្នកដែលមានតំណភ្ជាប់)»</strong><br>
              ៤. ចុច <strong>Copy link (ចម្លងតំណ)</strong> រួចត្រឡប់មកចុច <strong>«Sync Now»</strong> ម្តងទៀតជាការស្រេច!
            </div>
          </div>
        `;
      } else if (err.message === 'TIMEOUT') {
        errHtml = `
          <div style="text-align: left; color: #b91c1c; font-size: 13px;">
            ⚠️ ការតភ្ជាប់ទៅកាន់ Google Sheets លើសពេលកំណត់ (Timeout)! សូមពិនិត្យមើលអ៊ីនធឺណិតរបស់អ្នក ហើយចុចព្យាយាមម្តងទៀត។
          </div>
        `;
      } else if (err.message === 'CANNOT_DOWNLOAD') {
        errHtml = `
          <div style="text-align: left;">
            <div style="font-weight: 700; color: #b91c1c; font-size: 14px; margin-bottom: 6px;">
              ⚠️ មិនអាចទាញទិន្នន័យពី Link នេះបានឡើយ!
            </div>
            <div style="color: #450a0a; line-height: 1.6; font-size: 12.5px;">
              សូមប្រាកដថា ៖<br>
              • កុំព្យូទ័រមានភ្ជាប់អ៊ីនធឺណិត<br>
              • ឯកសារក្នុង Google Drive ត្រូវបានបើកជា <strong>Google Sheets</strong> (Open with Google Sheets)<br>
              • បានកំណត់ Share ជា «Anyone with the link» រួចរាល់។
            </div>
          </div>
        `;
      } else {
        errHtml = `<div style="text-align: left; font-weight: 600; color: #b91c1c;">❌ ${err.message || 'កំហុសមិនស្គាល់'}</div>`;
      }

      this.showStatus(errHtml, 'error');
    } finally {
      if (btnSync) {
        btnSync.disabled = false;
        btnSync.innerHTML = originalText;
      }
    }
  },

  getClassTokens() {
    const curClassId = (window.App && App.state && App.state.currentClassId) || '';
    const curClass = (window.App && App.state && Array.isArray(App.state.classes))
      ? App.state.classes.find(c => c.id === curClassId)
      : null;
    const name = curClass ? (curClass.name || '') : (window.App && App.state && App.state.schoolConfig && App.state.schoolConfig.className) || '';
    
    const tokens = new Set();
    const khmerDigits = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];

    const addVariants = (str) => {
      if (!str) return;
      const s = String(str).trim();
      if (!s) return;
      tokens.add(s.toLowerCase());

      // Khmer -> Arabic
      let toArabic = s;
      khmerDigits.forEach((kd, idx) => {
        toArabic = toArabic.split(kd).join(String(idx));
      });
      tokens.add(toArabic.toLowerCase());

      // Arabic -> Khmer
      let toKhmer = s;
      for (let i = 0; i <= 9; i++) {
        toKhmer = toKhmer.split(String(i)).join(khmerDigits[i]);
      }
      tokens.add(toKhmer.toLowerCase());

      // Without prefix 'ថ្នាក់ទី' / 'ថ្នាក់' / 'class'
      [s, toArabic, toKhmer].forEach(v => {
        const stripped = v.replace(/ថ្នាក់ទី|ថ្នាក់|grade|class/gi, '').trim().toLowerCase();
        if (stripped) tokens.add(stripped);
      });
    };

    if (name) addVariants(name);
    if (curClassId) {
      const cleanId = curClassId.replace(/^class_/, '').trim();
      addVariants(cleanId);
    }

    return Array.from(tokens).filter(t => t.length > 0);
  },

  sheetMatchesToken(sheetName, token) {
    if (!sheetName || !token) return false;
    const s = String(sheetName).toLowerCase().replace(/[\s_\-]+/g, '');
    const t = String(token).toLowerCase().replace(/[\s_\-]+/g, '');
    if (!t) return false;
    if (s === t) return true;
    if (t.length >= 2 && s.includes(t)) return true;
    return false;
  },

  isOverviewSheet(sheetName) {
    const s = String(sheetName || '').toLowerCase();
    return s.includes('ព័ត៌មាន') || s.includes('info') || s.includes('overview') || s.includes('instruction') || s.includes('about') || s.includes('readme');
  },

  syncScores(parsed, targetMonth) {
    const monthTokens = {
      'month_11': ['11', 'វិច្ឆិកា', 'nov'],
      'month_12': ['12', 'ធ្នូ', 'dec'],
      'month_01': ['01', '1', 'មករា', 'jan'],
      'month_02': ['02', '2', 'កុម្ភៈ', 'កុម្ភះ', 'feb'],
      'month_03': ['03', '3', 'មីនា', 'មិនា', 'mar'],
      'month_04': ['04', '4', 'មេសា', 'apr'],
      'month_05': ['05', '5', 'ឧសភា', 'may'],
      'month_06': ['06', '6', 'មិថុនា', 'jun'],
      'month_07': ['07', '7', 'កក្កដា', 'jul'],
      'month_08': ['08', '8', 'សីហា', 'aug'],
      'month_09': ['09', '9', 'កញ្ញា', 'sep'],
      'month_10': ['10', 'តុលា', 'oct'],
      'sem_1': ['ឆមាស១', 'ឆ.១', 'sem1', 'sem_1'],
      'sem_2': ['ឆមាស២', 'ឆ.២', 'sem2', 'sem_2']
    };

    const monthsToProcess = targetMonth === 'all' 
      ? (App.state.months ? App.state.months.map(m => m.id) : Object.keys(monthTokens))
      : [targetMonth];

    let totalUpdatedMonths = 0;
    let totalUpdatedStudents = 0;
    const updatedMonthNames = [];

    const classTokens = this.getClassTokens();
    const nonOverviewSheets = parsed.sheetNames.filter(s => !this.isOverviewSheet(s));

    monthsToProcess.forEach(mId => {
      const tokens = monthTokens[mId] || [];
      let targetSheetName = null;

      // Find matching sheet name
      if (parsed.sheetNames.length === 1) {
        targetSheetName = parsed.sheetNames[0];
      } else {
        // 1. Class token + Month token (e.g. "12A_វិច្ឆិកា")
        if (classTokens.length > 0 && tokens.length > 0) {
          targetSheetName = nonOverviewSheets.find(s => {
            const hasClass = classTokens.some(ct => this.sheetMatchesToken(s, ct));
            const hasMonth = tokens.some(t => s.toLowerCase().includes(t));
            return hasClass && hasMonth;
          });
        }

        // 2. Class token alone (e.g. Master Sheet with tabs "12A", "7F", "11F")
        if (!targetSheetName && classTokens.length > 0) {
          targetSheetName = nonOverviewSheets.find(s => classTokens.some(ct => this.sheetMatchesToken(s, ct)));
        }

        // 3. Month token alone (for single-class multi-month workbooks)
        if (!targetSheetName && tokens.length > 0) {
          targetSheetName = nonOverviewSheets.find(s => {
            const l = s.toLowerCase();
            return (l.includes('ពិន្ទុ') || l.includes('class') || l.includes('score')) && tokens.some(t => l.includes(t));
          }) || nonOverviewSheets.find(s => tokens.some(t => s.toLowerCase().includes(t)));
        }

        // 4. Fallback to first non-overview sheet
        if (!targetSheetName && targetMonth !== 'all') {
          targetSheetName = nonOverviewSheets[0] || parsed.sheetNames[0];
        }
      }

      if (!targetSheetName) return;

      const rows = parsed.sheets[targetSheetName];
      if (!rows || rows.length < 2) return;

      const updated = this.processSingleMonthScores(rows, mId);
      if (updated > 0) {
        totalUpdatedMonths++;
        totalUpdatedStudents = Math.max(totalUpdatedStudents, updated);
        const mObj = App.state.months.find(m => m.id === mId) || { name: mId };
        updatedMonthNames.push(mObj.name);
      }
    });

    if (totalUpdatedMonths === 0) {
      throw new Error('មិនអាចរកឃើញទិន្នន័យពិន្ទុ ឬក្បាលជួរមុខវិជ្ជាក្នុង Google Sheet ឡើយ!');
    }

    App.saveState();
    App.renderMonthlyScores();

    return `ទាញយកពិន្ទុជោគជ័យ! បានធ្វើបច្ចុប្បន្នភាព ${totalUpdatedMonths} ខែ (${updatedMonthNames.join(', ')}) សរុប ${totalUpdatedStudents} នាក់ និងបានគណនាចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ។`;
  },

  processSingleMonthScores(rows, monthId) {
    const subjects = App.state.subjects || [];
    const colMap = {};
    let idCol = -1;
    let nameCol = -1;
    let genderCol = -1;
    let subjRowIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 12); r++) {
      const row = rows[r];
      if (!row) continue;
      row.forEach((col, idx) => {
        const c = String(col || '').trim().toLowerCase();
        if ((c.includes('ល.រ') || c === 'no' || c === 'id' || c === 'លរ') && idCol === -1) idCol = idx;
        if ((c.includes('គោត្តនាម') || (c.includes('ឈ្មោះ') && !c.includes('គ្រឹះស្ថាន') && !c.includes('សាលា') && !c.includes('ឪពុក') && !c.includes('ម្តាយ'))) && nameCol === -1) nameCol = idx;
        if ((c.includes('ភេទ') || c === 'sex' || c === 'gender') && genderCol === -1) genderCol = idx;

        if (c.includes('ភាសាខ្មែរ') || (c === 'តែង' || c === 'សរសេរ' || c === 'ខ្មែរ')) colMap['khmer'] = idx;
        if (c.includes('សីលធម៌') || c === 'សីល' || c.includes('ពលរដ្ឋ')) colMap['civics'] = idx;
        if (c.includes('ប្រវត្តិ') || c === 'ប្រវត្តិ') colMap['history'] = idx;
        if (c.includes('ភូមិវិទ្យា') || (c === 'ភូមិ' && colMap['geo'] === undefined)) colMap['geo'] = idx;
        if (c.includes('គណិត') || c === 'math') colMap['math'] = idx;
        if (c.includes('ផែនដី') || c === 'ផែន') colMap['earth'] = idx;
        if (c.includes('រូបវិទ្យា') || (c === 'រូប' && colMap['physics'] === undefined)) colMap['physics'] = idx;
        if (c.includes('គីមី') || c === 'គីមី') colMap['chemistry'] = idx;
        if (c.includes('ជីវវិទ្យា') || c.includes('ជីវៈវិទ្យា') || c === 'ជីវ' || c === 'ជីវៈ') colMap['biology'] = idx;
        if (c.includes('អង់គ្លេស') || c.includes('បរទេស') || c === 'អង់' || c === 'english') colMap['english'] = idx;
        if (c.includes('សេដ្ឋកិច្ច') || c.includes('សេដ្ឋ') || c.includes('econ')) colMap['economics'] = idx;
        if (c.includes('កុំព្យូទ័រ') || c.includes('ព័ត៌មាន') || c.includes('ict') || c.includes('comput')) colMap['computer'] = idx;
        if (c.includes('កសិកម្ម') || c.includes('កសិ') || c.includes('agri')) colMap['agri'] = idx;
        if (c.includes('គេហវិទ្យា') || c.includes('គេហ') || c.includes('home')) colMap['home_econ'] = idx;
        if (c.includes('សុខភាព') || c.includes('health')) colMap['health'] = idx;
        if (c.includes('កីឡា') || c.includes('អប់រំកាយ') || c.includes('sport') || c.includes('pe')) colMap['sport'] = idx;
      });

      if (Object.keys(colMap).length >= 3 && subjRowIdx === -1) {
        subjRowIdx = r;
      }
    }

    if (Object.keys(colMap).length === 0) return 0;

    if (!App.state.scoresByPeriod) App.state.scoresByPeriod = {};
    if (!App.state.scoresByPeriod[monthId]) App.state.scoresByPeriod[monthId] = {};

    let updatedCount = 0;
    const currentMonthScores = App.state.scoresByPeriod[monthId];
    const startRow = subjRowIdx >= 0 ? subjRowIdx + 1 : 1;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      let student = null;
      // 1. Match by clean name first
      if (nameCol !== -1 && row[nameCol]) {
        const cleanName = String(row[nameCol]).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().replace(/^ក\.\s*/, '').replace(/\s+/g, ' ');
        student = App.state.students.find(s => {
          const sName = String(s.name || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().replace(/^ក\.\s*/, '').replace(/\s+/g, ' ');
          return sName === cleanName;
        });
      }

      // 2. Match by student ID / number
      if (!student && idCol !== -1 && row[idCol] !== undefined && row[idCol] !== '') {
        const sid = parseInt(row[idCol], 10);
        if (!isNaN(sid)) {
          student = App.state.students.find(s => s.id === sid);
        }
      }

      // 3. Fallback: Auto-add student if not in roster yet
      if (!student && nameCol !== -1 && row[nameCol]) {
        const rawName = String(row[nameCol]).trim();
        let gender = 'ប្រុស';
        if (genderCol !== -1 && row[genderCol]) {
          const gStr = String(row[genderCol]).trim().toLowerCase();
          if (gStr === 'ស្រី' || gStr === 'f' || gStr === 'female' || gStr === 'ស') gender = 'ស្រី';
        }
        const sid = (idCol !== -1 && row[idCol] && !isNaN(parseInt(row[idCol], 10)))
          ? parseInt(row[idCol], 10)
          : (App.state.students.length > 0 ? Math.max(...App.state.students.map(s => s.id)) + 1 : 1);
        student = {
          id: sid,
          name: rawName,
          gender: gender,
          dob: '',
          phone: '',
          photo: ''
        };
        App.state.students.push(student);
      }

      if (!student) continue;

      if (!currentMonthScores[student.id]) {
        currentMonthScores[student.id] = {};
      }

      Object.keys(colMap).forEach(subjId => {
        const cIdx = colMap[subjId];
        const rawVal = row[cIdx];
        const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        if (strVal !== '' && strVal !== '-' && strVal !== 'x' && strVal !== 'X') {
          const numVal = parseFloat(strVal);
          if (!isNaN(numVal) && numVal >= 0) {
            const subjDef = subjects.find(s => s.id === subjId);
            const max = subjDef ? subjDef.max : 100;
            currentMonthScores[student.id][subjId] = Math.min(numVal, max);
          }
        } else {
          delete currentMonthScores[student.id][subjId];
        }
      });

      updatedCount++;
    }

    // Recompute rankings
    if (window.Calculations && Calculations.computePeriodData) {
      const pData = Calculations.computePeriodData(monthId, App.state);
      if (!App.state.monthlyRankings) App.state.monthlyRankings = {};
      App.state.monthlyRankings[monthId] = pData.map(d => ({
        id: d.id,
        name: d.name,
        gender: d.gender,
        total: d.total,
        avg: d.avg,
        grade: d.grade,
        rank: d.rank
      }));
    }

    return updatedCount;
  },

  syncAttendance(parsed, targetMonth) {
    const classTokens = this.getClassTokens();
    const nonOverviewSheets = parsed.sheetNames.filter(s => !this.isOverviewSheet(s));
    let targetSheetName = nonOverviewSheets[0] || parsed.sheetNames[0];

    // 1. Class token + Attendance keyword
    if (classTokens.length > 0) {
      const classAtt = nonOverviewSheets.find(s => {
        const l = s.toLowerCase();
        const hasAtt = l.includes('វត្តមាន') || l.includes('attend') || l.includes('ច្បាប់');
        const hasClass = classTokens.some(ct => this.sheetMatchesToken(s, ct));
        return hasClass && hasAtt;
      });
      if (classAtt) {
        targetSheetName = classAtt;
      } else {
        // 2. Class token alone
        const classSheet = nonOverviewSheets.find(s => classTokens.some(ct => this.sheetMatchesToken(s, ct)));
        if (classSheet) targetSheetName = classSheet;
      }
    }

    // 3. Attendance keyword alone
    if (!targetSheetName || targetSheetName === nonOverviewSheets[0]) {
      const attSheet = nonOverviewSheets.find(s => {
        const l = s.toLowerCase();
        return l.includes('វត្តមាន') || l.includes('attend') || l.includes('ច្បាប់');
      });
      if (attSheet) targetSheetName = attSheet;
    }

    const rows = parsed.sheets[targetSheetName];
    if (!rows || rows.length < 2) {
      throw new Error('សន្លឹកកិច្ចការវត្តមានគ្មានទិន្នន័យគ្រប់គ្រាន់ឡើយ!');
    }

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = rows[i].map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('ច្បាប់') || rowStr.includes('វត្តមាន') || rowStr.includes('permission') || rowStr.includes('ឈ្មោះ')) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerRow = rows[headerRowIdx];
    let idCol = -1, nameCol = -1, permCol = -1, noPermCol = -1;

    headerRow.forEach((col, idx) => {
      const str = String(col || '').trim().toLowerCase();
      if (str.includes('ល.រ') || str === 'no' || str === 'id' || str === 'លរ') idCol = idx;
      if (str.includes('ឈ្មោះ') || str.includes('name') || str.includes('គោត្តនាម')) nameCol = idx;
      if ((str.includes('មានច្បាប់') || str.includes('permission') || str.includes('ច្បាប់') || str === 'ច') && !str.includes('ឥត') && !str.includes('គ្មាន')) {
        permCol = idx;
      }
      if (str.includes('ឥតច្បាប់') || str.includes('គ្មានច្បាប់') || str.includes('nopermission') || str.includes('unexcused') || str === 'អ' || str === 'អ.ច' || str === 'ឥត') {
        noPermCol = idx;
      }
    });

    if (permCol === -1 && noPermCol === -1) {
      throw new Error('មិនអាចរកឃើញក្បាលជួរ «អវត្តមានមានច្បាប់» ឬ «អវត្តមានឥតច្បាប់» ឡើយ!');
    }

    const mId = (targetMonth === 'all') ? (App.currentMonthId || 'month_11') : targetMonth;
    if (!App.state.attendance) App.state.attendance = {};
    if (!App.state.attendance[mId]) App.state.attendance[mId] = {};

    let updatedCount = 0;
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      let student = null;
      if (idCol !== -1 && row[idCol] !== undefined && row[idCol] !== '') {
        const sid = parseInt(row[idCol], 10);
        if (!isNaN(sid)) student = App.state.students.find(s => s.id === sid);
      }
      if (!student && nameCol !== -1 && row[nameCol]) {
        const cleanName = String(row[nameCol]).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().replace(/^ក\.\s*/, '').replace(/\s+/g, ' ');
        student = App.state.students.find(s => s.name.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().replace(/^ក\.\s*/, '').replace(/\s+/g, ' ') === cleanName);
      }

      if (!student) continue;

      let pVal = 0, npVal = 0;
      if (permCol !== -1 && row[permCol] !== undefined && row[permCol] !== '') {
        const parsedP = parseInt(row[permCol], 10);
        if (!isNaN(parsedP) && parsedP >= 0) pVal = parsedP;
      }
      if (noPermCol !== -1 && row[noPermCol] !== undefined && row[noPermCol] !== '') {
        const parsedNP = parseInt(row[noPermCol], 10);
        if (!isNaN(parsedNP) && parsedNP >= 0) npVal = parsedNP;
      }

      App.state.attendance[mId][student.id] = {
        permission: pVal,
        noPermission: npVal
      };
      updatedCount++;
    }

    App.saveState();
    App.renderAttendance();

    const mInfo = App.state.months.find(m => m.id === mId) || { name: mId };
    return `ទាញយកអវត្តមានជោគជ័យ! បានធ្វើបច្ចុប្បន្នភាពវត្តមានសម្រាប់សិស្សចំនួន ${updatedCount} នាក់ (${mInfo.name})។`;
  },

  syncStudents(parsed) {
    const classTokens = this.getClassTokens();
    const nonOverviewSheets = parsed.sheetNames.filter(s => !this.isOverviewSheet(s));
    let targetSheetName = nonOverviewSheets[0] || parsed.sheetNames[0];

    // 1. Class token + Roster keyword
    if (classTokens.length > 0) {
      const classRoster = nonOverviewSheets.find(s => {
        const l = s.toLowerCase();
        const hasRoster = l.includes('សិស្ស') || l.includes('roster') || l.includes('student') || l.includes('បញ្ជី');
        const hasClass = classTokens.some(ct => this.sheetMatchesToken(s, ct));
        return hasClass && hasRoster;
      });
      if (classRoster) {
        targetSheetName = classRoster;
      } else {
        // 2. Class token alone (e.g. Master sheet "12A", "7F", "11F")
        const classSheet = nonOverviewSheets.find(s => classTokens.some(ct => this.sheetMatchesToken(s, ct)));
        if (classSheet) targetSheetName = classSheet;
      }
    }

    // 3. Roster keyword alone
    if (!targetSheetName || targetSheetName === nonOverviewSheets[0]) {
      const rosterSheet = nonOverviewSheets.find(s => {
        const l = s.toLowerCase();
        return l.includes('សិស្ស') || l.includes('roster') || l.includes('student') || l.includes('បញ្ជី');
      });
      if (rosterSheet) targetSheetName = rosterSheet;
    }

    const rows = parsed.sheets[targetSheetName];
    if (!rows || rows.length < 2) {
      throw new Error('សន្លឹកកិច្ចការបញ្ជីសិស្សគ្មានទិន្នន័យគ្រប់គ្រាន់ឡើយ!');
    }

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const rowStr = rows[i].map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('គោត្តនាម') || (rowStr.includes('ឈ្មោះ') && !rowStr.includes('សាលា')) || rowStr.includes('ភេទ')) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerRow = rows[headerRowIdx];
    let idCol = -1, nameCol = -1, genderCol = -1, dobCol = -1, phoneCol = -1;

    headerRow.forEach((col, idx) => {
      const str = String(col || '').trim().toLowerCase();
      if ((str.includes('ល.រ') || str === 'no' || str === 'id') && idCol === -1) idCol = idx;
      if ((str.includes('គោត្តនាម') || str.includes('ឈ្មោះ')) && nameCol === -1) nameCol = idx;
      if (str.includes('ភេទ') || str === 'sex' || str === 'gender') genderCol = idx;
      if (str.includes('កំណើត') || str.includes('dob') || str.includes('birth')) dobCol = idx;
      if (str.includes('ទូរស័ព្ទ') || str.includes('phone') || str.includes('tel')) phoneCol = idx;
    });

    if (nameCol === -1) {
      throw new Error('មិនអាចរកឃើញក្បាលជួរ «ឈ្មោះ» ឬ «គោត្តនាម» ឡើយ!');
    }

    let updatedCount = 0;
    let addedCount = 0;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawName = String(row[nameCol] || '').trim();
      if (!rawName) continue;

      let gender = 'ប្រុស';
      if (genderCol !== -1 && row[genderCol]) {
        const gStr = String(row[genderCol]).trim().toLowerCase();
        if (gStr === 'ស្រី' || gStr === 'f' || gStr === 'female' || gStr === 'ស') gender = 'ស្រី';
      }

      let sid = (idCol !== -1 && row[idCol]) ? parseInt(row[idCol], 10) : null;
      let existing = null;
      if (sid && !isNaN(sid)) {
        existing = App.state.students.find(s => s.id === sid);
      }
      if (!existing) {
        existing = App.state.students.find(s => s.name.trim() === rawName);
      }

      if (existing) {
        existing.name = rawName;
        existing.gender = gender;
        if (dobCol !== -1 && row[dobCol]) existing.dob = String(row[dobCol]).trim();
        if (phoneCol !== -1 && row[phoneCol]) existing.phone = String(row[phoneCol]).trim();
        updatedCount++;
      } else {
        const nextId = App.state.students.length > 0 ? Math.max(...App.state.students.map(s => s.id)) + 1 : 1;
        App.state.students.push({
          id: nextId,
          name: rawName,
          gender: gender,
          dob: (dobCol !== -1 && row[dobCol]) ? String(row[dobCol]).trim() : '',
          phone: (phoneCol !== -1 && row[phoneCol]) ? String(row[phoneCol]).trim() : '',
          photo: ''
        });
        addedCount++;
      }
    }

    App.saveState();
    App.renderStudentsList();
    App.updateSidebarCounts();

    return `ទាញយកបញ្ជីសិស្សជោគជ័យ! បន្ថែមថ្មី: ${addedCount} នាក់, កែសម្រួល: ${updatedCount} នាក់។`;
  },

  showStatus(message, type = 'info') {
    const el = document.getElementById('gsheet-sync-status');
    if (!el) return;

    el.style.display = 'block';
    if (type === 'loading') {
      el.style.background = '#eff6ff';
      el.style.color = '#1e40af';
      el.style.border = '1px solid #bfdbfe';
    } else if (type === 'success') {
      el.style.background = '#f0fdf4';
      el.style.color = '#166534';
      el.style.border = '1.5px solid #86efac';
    } else if (type === 'error') {
      el.style.background = '#fef2f2';
      el.style.color = '#991b1b';
      el.style.border = '1.5px solid #fecaca';
    } else {
      el.style.background = '#f8fafc';
      el.style.color = '#334155';
      el.style.border = '1px solid #cbd5e1';
    }
    el.innerHTML = message;
  },

  hideStatus() {
    const el = document.getElementById('gsheet-sync-status');
    if (el) el.style.display = 'none';
  }
};

// Initialize when DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GSheetSync.init());
  } else {
    GSheetSync.init();
  }
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GSheetSync;
}
