/**
 * Storage and Export/Import Management
 */

const Storage = {
  KEY: 'khmer_score_management_v1',

  loadData() {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data === 'object') {
          // Strictly preserve stored student data without resurrecting cleared/deleted students
          if (!Array.isArray(data.students)) {
            data.students = [];
          } else {
            data.students.forEach(s => {
              if (s && typeof s === 'object') {
                if (!s.secondarySchool && s.diplomaSchool) {
                  s.secondarySchool = s.diplomaSchool;
                } else if (!s.diplomaSchool && s.secondarySchool) {
                  s.diplomaSchool = s.secondarySchool;
                }
              }
            });
          }

          // Strictly preserve stored score tables without repopulating from DEFAULT_DATA
          if (!data.scoresByPeriod || typeof data.scoresByPeriod !== 'object') {
            data.scoresByPeriod = {};
          }

          // Ensure March (month_03) belongs to Semester 2
          if (Array.isArray(data.months)) {
            const m3 = data.months.find(m => m.id === 'month_03');
            if (m3 && m3.sem !== 2) {
              m3.sem = 2;
            }
          }

          // Strictly preserve attendance
          if (!data.attendance || typeof data.attendance !== 'object') {
            data.attendance = {};
          }

          // Strictly preserve custom & disabled holidays (Solar calendar holidays)
          if (!Array.isArray(data.customHolidays)) {
            data.customHolidays = [];
          }
          if (!data.disabledHolidays || typeof data.disabledHolidays !== 'object') {
            data.disabledHolidays = {};
          }

          // Strictly preserve classLock
          if (!data.classLock || typeof data.classLock !== 'object') {
            data.classLock = {
              isLocked: false,
              lockedClassId: null,
              pinHash: '',
              lockedAt: null,
              classTitle: ''
            };
          }

          // Strictly preserve rankings
          if (!data.monthlyRankings || typeof data.monthlyRankings !== 'object') {
            data.monthlyRankings = {};
          }
          if (!data.semesterRankings || typeof data.semesterRankings !== 'object') {
            data.semesterRankings = { sem1List: [], sem2List: [], yearList: [] };
          }

          // Strictly preserve score tables without repopulating from DEFAULT_DATA
          if (data.scoresByPeriod) {
            // Clean ghost students (IDs not present in data.students)
            const validStudentIds = new Set((data.students || []).map(s => String(s.id)));
            if (validStudentIds.size > 0) {
              for (const p of Object.keys(data.scoresByPeriod)) {
                if (data.scoresByPeriod[p] && typeof data.scoresByPeriod[p] === 'object') {
                  for (const sid of Object.keys(data.scoresByPeriod[p])) {
                    if (!validStudentIds.has(String(sid))) {
                      delete data.scoresByPeriod[p][sid];
                    }
                  }
                }
              }
            }
          }

          // Always ensure fresh dynamic calculation for semesterRankings & yearSummary
          data.semesterRankings = { sem1List: [], sem2List: [], yearList: [] };
          data.yearSummary = {};

          // Persist sanitized state back immediately to wipe any stale cached values in localStorage
          try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
          } catch (e) {}

          // Structural schema fallbacks only if completely missing
          if (!data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
            data.subjects = window.DEFAULT_DATA?.subjects || [];
          }
          if (!data.months || !Array.isArray(data.months) || data.months.length === 0) {
            data.months = window.DEFAULT_DATA?.months || [];
          }
          if (!data.schoolConfig || typeof data.schoolConfig !== 'object') {
            data.schoolConfig = window.DEFAULT_DATA?.schoolConfig || {};
          }
          if (!Array.isArray(data.classes)) {
            data.classes = [];
          } else {
            // Clean ghost students in classes
            data.classes.forEach(cls => {
              if (cls && typeof cls === 'object') {
                const clsValidIds = new Set((cls.students || []).map(s => String(s.id)));
                if (clsValidIds.size > 0 && cls.scoresByPeriod && typeof cls.scoresByPeriod === 'object') {
                  for (const p of Object.keys(cls.scoresByPeriod)) {
                    if (cls.scoresByPeriod[p] && typeof cls.scoresByPeriod[p] === 'object') {
                      for (const sid of Object.keys(cls.scoresByPeriod[p])) {
                        if (!clsValidIds.has(String(sid))) {
                          delete cls.scoresByPeriod[p][sid];
                        }
                      }
                    }
                  }
                }
              }
            });
          }

          // Round all rankings averages to 2 decimals if present
          if (data.monthlyRankings) {
            Object.keys(data.monthlyRankings).forEach(k => {
              if (Array.isArray(data.monthlyRankings[k])) {
                data.monthlyRankings[k].forEach(item => {
                  if (typeof item.avg === 'number') item.avg = parseFloat(item.avg.toFixed(2));
                });
              }
            });
          }
          if (data.semesterRankings) {
            ['sem1List', 'sem2List', 'yearList'].forEach(k => {
              if (Array.isArray(data.semesterRankings[k])) {
                data.semesterRankings[k].forEach(item => {
                  if (typeof item.m1 === 'number') item.m1 = parseFloat(item.m1.toFixed(2));
                  if (typeof item.m2 === 'number') item.m2 = parseFloat(item.m2.toFixed(2));
                  if (typeof item.avg === 'number') item.avg = parseFloat(item.avg.toFixed(2));
                });
              }
            });
          }

          // Persist cleaned storage so changes take effect immediately
          try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
          } catch (err) {
            console.warn('Could not persist cleaned data to localStorage', err);
          }

          return data;
        }
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    // Fallback to initial 12A template on first launch or corrupt storage
    const fallback = JSON.parse(JSON.stringify(window.DEFAULT_DATA || {}));
    if (fallback) {
      fallback.semesterRankings = { sem1List: [], sem2List: [], yearList: [] };
      fallback.yearSummary = {};
      fallback.classLock = {
        isLocked: false,
        lockedClassId: null,
        pinHash: '',
        lockedAt: null,
        classTitle: ''
      };
    }
    return fallback;
  },

  saveData(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  },

  resetToDefault() {
    try {
      localStorage.removeItem(this.KEY);
      return JSON.parse(JSON.stringify(window.DEFAULT_DATA));
    } catch (e) {
      console.error('Failed to reset data:', e);
      return window.DEFAULT_DATA;
    }
  },

  exportJSON(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ទិន្នន័យពិន្ទុ_${data.schoolConfig?.className || '12A'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export master data as a standalone JavaScript file (data.js)
   * Replacing js/data.js allows the entire folder to open with current data on ANY computer without importing.
   */
  exportDataJS(data) {
    const exportTime = new Date().toISOString();
    const content = `/**
 * Master Data Configuration
 * Exported: ${exportTime}
 * Compatible with High School Student Score Management System
 */

window.DEFAULT_DATA = ${JSON.stringify(data, null, 2)};
`;
    const blob = new Blob([content], { type: 'application/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportCSV(rows, filename) {
    // Add UTF-8 BOM so Excel opens Khmer characters correctly
    let csvContent = '\uFEFF';
    rows.forEach(row => {
      const escapedRow = row.map(cell => {
        let str = cell === null || cell === undefined ? '' : String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csvContent += escapedRow.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export fully styled HTML table to Excel (.xls) preserving exact layout, colors, borders, Khmer fonts,
   * page orientation (Landscape/Portrait), paper size (A4), and 1-page fit.
   * Compatible with Microsoft Excel, Google Sheets, WPS Office, LibreOffice.
   */
  exportStyledExcel(htmlContent, filename = 'តារាង.xls', sheetName = 'ទិន្នន័យ', options = {}) {
    try {
      const opts = typeof options === 'string' ? { orientation: options } : (options || {});
      const orientation = opts.orientation || (
        htmlContent.includes('colspan="3') || htmlContent.includes('colspan="4') || htmlContent.includes('colspan="5') ||
        htmlContent.includes('colspan="6') || htmlContent.includes('colspan="17') || htmlContent.includes('តារាងពិន្ទុ') || htmlContent.includes('តារាងស្រង់ពិន្ទុ') ||
        htmlContent.includes('តារាងចំណាត់ថ្នាក់') || htmlContent.includes('លទ្ធផលសិក្សា') || htmlContent.includes('ពិន្ទុ') ||
        htmlContent.includes('ចំណាត់ថ្នាក់') || htmlContent.includes('តារាងស្រង់អវត្តមាន') || htmlContent.includes('បញ្ជីរាយនាមសិស្ស')
          ? 'landscape'
          : 'portrait'
      );
      const isLandscape = orientation.toLowerCase() === 'landscape';
      const orientationXml = isLandscape ? 'Landscape' : 'Portrait';
      const orientationCss = isLandscape ? 'landscape' : 'portrait';
      const fitToPage = opts.fitToPage !== false;
      const fitWidth = (opts.fitWidth !== undefined && opts.fitWidth !== null) ? opts.fitWidth : 1;
      const fitHeight = (opts.fitHeight !== undefined && opts.fitHeight !== null) ? opts.fitHeight : (isLandscape ? 0 : 1);
      const paperSizeIndex = opts.paperSizeIndex || 9; // 9 = A4

      let fullHtml = htmlContent;
      if (!htmlContent.includes('<html')) {
        fullHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <style>
            <!--
            @page {
              size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
              margin: .35in .35in .35in .35in;
              mso-header-margin: .2in;
              mso-footer-margin: .2in;
              mso-page-orientation: ${orientationCss};
            }
            @page Section1 {
              size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
              margin: .35in .35in .35in .35in;
              mso-header-margin: .2in;
              mso-footer-margin: .2in;
              mso-page-orientation: ${orientationCss};
            }
            div.Section1 {
              page: Section1;
            }
            -->
            </style>
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>${String(sheetName).replace(/[\\/?*\[\]]/g, '').slice(0, 31)}</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                      ${fitToPage ? '<x:FitToPage/>' : ''}
                      <x:PageSetup>
                        <x:Layout x:Orientation="${orientationXml}"/>
                        <x:Header x:Margin="0.2"/>
                        <x:Footer x:Margin="0.2"/>
                        <x:PageMargins x:Bottom="0.35" x:Left="0.35" x:Right="0.35" x:Top="0.35"/>
                      </x:PageSetup>
                      <x:Print>
                        <x:ValidPrinterInfo/>
                        <x:PaperSizeIndex>${paperSizeIndex}</x:PaperSizeIndex>
                        ${isLandscape ? '<x:Landscape/>' : ''}
                        ${fitToPage && fitWidth && Number(fitWidth) > 0 ? `<x:FitWidth>${fitWidth}</x:FitWidth>` : ''}
                        ${fitToPage && fitHeight && Number(fitHeight) > 0 ? `<x:FitHeight>${fitHeight}</x:FitHeight>` : ''}
                      </x:Print>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              body { 
                font-family: 'Khmer OS Siemreap', 'Kantumruy Pro', 'Segoe UI', Arial, sans-serif; 
                font-size: 10pt; 
                color: #0f172a; 
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                font-family: 'Khmer OS Siemreap', 'Kantumruy Pro', 'Segoe UI', Arial, sans-serif; 
              }
              th, td { 
                border: 0.5pt solid #000000; 
                padding: 4px 6px; 
                font-size: 9.5pt; 
                vertical-align: middle; 
                font-family: 'Khmer OS Siemreap', 'Kantumruy Pro', 'Segoe UI', Arial, sans-serif;
              }
              th { 
                background-color: #f1f5f9; 
                font-weight: bold; 
                text-align: center; 
              }
              .no-border, .no-border td, .no-border th { 
                border: none !important; 
              }
              .border-none { border: none !important; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .header-title, .rc-doc-title, .mr-title-main, .att-title, .pyramid-title-main { 
                font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif !important; 
                font-size: 13pt; 
                color: #002060; 
                text-align: center; 
              }
              .header-subtitle { 
                font-size: 10.5pt; 
                text-align: center; 
                color: #334155; 
              }
              .header-kingdom, .rc-kingdom, .mr-kingdom-text, .att-kingdom-text, .pyramid-kingdom { 
                font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif !important; 
                font-size: 11pt; 
                text-align: center; 
              }
              .header-motto, .rc-motto, .mr-motto-text, .att-motto-text, .pyramid-motto { 
                font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif !important; 
                font-size: 10pt; 
                text-align: center; 
              }
              .decor-tacteng, .royal-flourish, .pyramid-ornament, .rc-divider-dots, .mr-decor-symbols, .att-royal-ornament, .moeys-decor-symbol {
                font-family: 'Tacteng', 'Tacteing', 'Khmer OS Tacteng', serif !important;
                font-size: 16pt !important;
                line-height: 1 !important;
                text-align: center;
                color: #d97706;
              }
              .bg-header-blue { 
                background-color: #1e3a8a !important; 
                color: #ffffff !important; 
                font-weight: bold; 
                text-align: center; 
              }
              .bg-sub-blue { 
                background-color: #0284c7 !important; 
                color: #ffffff !important; 
                font-weight: bold; 
                text-align: center; 
              }
              .bg-light-blue { 
                background-color: #e0f2fe !important; 
              }
              .bg-holiday { 
                background-color: #fee2e2 !important; 
                color: #dc2626 !important; 
                font-weight: bold; 
                text-align: center; 
              }
              .text-red { 
                color: #dc2626 !important; 
                font-weight: bold; 
              }
              .text-green { 
                color: #166534 !important; 
                font-weight: bold; 
              }
              .gender-female { 
                color: #db2777 !important; 
                font-weight: bold; 
                text-align: center; 
              }
              .gender-male { 
                color: #0284c7 !important; 
                text-align: center; 
              }
              .rank-gold { background-color: #fef3c7 !important; font-weight: bold; }
              .rank-silver { background-color: #f1f5f9 !important; font-weight: bold; }
              .rank-bronze { background-color: #ffedd5 !important; font-weight: bold; }
              .sig-title { font-weight: bold; text-align: center; font-size: 10pt; }
              .sig-date { font-style: italic; text-align: center; font-size: 9.5pt; }
              .sig-name { font-weight: bold; text-align: center; font-size: 10.5pt; padding-top: 45px; }
            </style>
          </head>
          <body class="${isLandscape ? 'Section1' : ''}">
            <div class="${isLandscape ? 'Section1' : ''}">
              ${htmlContent}
            </div>
          </body>
          </html>
        `;
      }

      const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx')
        ? filename.replace(/\.xlsx$/, '.xls')
        : filename + '.xls';
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('Error exporting styled Excel:', err);
      alert('កំហុសក្នុងការនាំចេញ Excel: ' + err.message);
      return false;
    }
  },

  /**
   * Export multiple or single sheets to real Excel .xlsx file using SheetJS
   */
  exportXLSX(sheetsData, filename) {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនត្រូវបានផ្ទុកឡើយ!');
      return false;
    }
    try {
      const wb = XLSX.utils.book_new();

      // If sheetsData is an Array, treat as single sheet
      const sheets = Array.isArray(sheetsData) ? { 'ទិន្នន័យ': sheetsData } : sheetsData;

      Object.keys(sheets).forEach(sheetName => {
        const rows = sheets[sheetName] || [];
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Auto calculate column widths
        const colWidths = [];
        rows.forEach(row => {
          if (!Array.isArray(row)) return;
          row.forEach((cell, colIdx) => {
            const valStr = cell === null || cell === undefined ? '' : String(cell);
            const len = Math.max(valStr.length, 4);
            colWidths[colIdx] = Math.max(colWidths[colIdx] || 0, len);
          });
        });
        ws['!cols'] = colWidths.map(w => ({ wch: Math.min(Math.max(w + 3, 7), 50) }));
        ws['!pageSetup'] = { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 1 };
        ws['!margins'] = { left: 0.35, right: 0.35, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 };

        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      });

      XLSX.writeFile(wb, filename);
      return true;
    } catch (err) {
      console.error('Error exporting XLSX:', err);
      alert('កំហុសក្នុងការនាំចេញ Excel: ' + err.message);
      return false;
    }
  },

  /**
   * Export multiple sheets to a true Excel (.xlsx) file using SheetJS (XLSX).
   * Supports HTML table strings, DOM table elements, or 2D row arrays.
   * Compatible with Microsoft Excel, Google Sheets, WPS Office, LibreOffice.
   * @param {Array<{ name: string, html?: string, table?: HTMLTableElement, rows?: Array }>} sheets
   * @param {string} filename
   * @param {object} options
   */
  exportMultiSheetExcel(sheets, filename = 'តារាង.xlsx', options = {}) {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនត្រូវបានផ្ទុកឡើយ!');
      return false;
    }
    try {
      const wb = XLSX.utils.book_new();
      const orientation = options.orientation || 'landscape';
      const isLandscape = orientation.toLowerCase() === 'landscape';

      (sheets || []).forEach((sheetObj, index) => {
        const sheetName = String(sheetObj.name || `សន្លឹក${index + 1}`).replace(/[\\/?*\[\]]/g, '').slice(0, 31);
        let ws = null;

        if (sheetObj.table) {
          ws = XLSX.utils.table_to_sheet(sheetObj.table, { raw: false });
        } else if (sheetObj.html) {
          if (typeof document !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sheetObj.html;
            const tbl = tempDiv.querySelector('table');
            if (tbl) {
              ws = XLSX.utils.table_to_sheet(tbl, { raw: false });
            }
          }
          if (!ws) {
            const parsedWb = XLSX.read(sheetObj.html, { type: 'string' });
            if (parsedWb && parsedWb.SheetNames.length > 0) {
              ws = parsedWb.Sheets[parsedWb.SheetNames[0]];
            }
          }
        } else if (sheetObj.rows) {
          ws = XLSX.utils.aoa_to_sheet(sheetObj.rows);
        }

        if (!ws) {
          ws = XLSX.utils.aoa_to_sheet([['គ្មានទិន្នន័យ']]);
        }

        // Auto-calculate or apply provided column widths
        if (sheetObj.colWidths && Array.isArray(sheetObj.colWidths)) {
          ws['!cols'] = sheetObj.colWidths;
        } else if (ws['!ref']) {
          const range = XLSX.utils.decode_range(ws['!ref']);
          const colWidths = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxLen = 4;
            for (let R = range.s.r; R <= range.e.r; ++R) {
              if (R < 7 && range.e.c > 10) continue;
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = ws[cellAddress];
              if (cell && cell.v !== undefined) {
                const str = String(cell.v);
                const len = str.length;
                if (len > maxLen && len < 45) {
                  maxLen = len;
                }
              }
            }
            colWidths[C] = { wch: Math.min(Math.max(maxLen + 2, 6), 40) };
          }
          ws['!cols'] = colWidths;
        }

        if (sheetObj.rowHeights && Array.isArray(sheetObj.rowHeights)) {
          ws['!rows'] = sheetObj.rowHeights;
        }

        const sheetFitHeight = sheetObj.fitHeight !== undefined ? sheetObj.fitHeight : (options.fitHeight !== undefined ? options.fitHeight : 0);
        ws['!pageSetup'] = {
          paperSize: sheetObj.paperSize || 9, // A4
          orientation: sheetObj.orientation || (isLandscape ? 'landscape' : 'portrait'),
          fitToWidth: sheetObj.fitWidth !== undefined ? sheetObj.fitWidth : (options.fitWidth !== undefined ? options.fitWidth : 1),
          fitToHeight: sheetFitHeight
        };
        ws['!margins'] = { left: 0.35, right: 0.35, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 };

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const safeFilename = filename.endsWith('.xlsx') ? filename : filename.replace(/\.xls$/, '') + '.xlsx';
      XLSX.writeFile(wb, safeFilename);
      return true;
    } catch (err) {
      console.error('Error exporting multi-sheet Excel:', err);
      alert('កំហុសក្នុងការនាំចេញ Excel ច្រើនសន្លឹក: ' + err.message);
      return false;
    }
  },

  /**
   * Read uploaded .xlsx, .xls, or .csv file using SheetJS
   * Returns Promise resolving to { sheetNames: [...], sheets: { [sheetName]: 2D_Array } }
   */
  readExcelFile(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('បណ្ណាល័យ XLSX មិនត្រូវបានផ្ទុកឡើយ!'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
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
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};

window.Storage = Storage;
