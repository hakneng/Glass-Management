/**
 * MoEYS Khmer Grading & Academic Calculation Engine
 * ស្របតាមស្តង់ដារក្រសួងអប់រំ យុវជន និងកីឡា
 */

const Calculations = {
  // Check if subject is English (bonus language subject in Grade 12)
  isEnglishSubject(sub) {
    if (!sub) return false;
    const id = (sub.id || '').toLowerCase();
    const name = (sub.name || '').toLowerCase();
    return id === 'english' || id === 'eng' || name.includes('អង់គ្លេស') || sub.isEnglishBonus === true;
  },

  // Helper to normalize Khmer numerals (០-៩) to ASCII digits (0-9)
  normalizeKhmerDigits(str) {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    let res = String(str || '');
    for (let i = 0; i < 10; i++) {
      res = res.split(khmerDigits[i]).join(String(i));
    }
    return res;
  },

  // Helper to convert ASCII digits (0-9) to Khmer numerals (០-៩)
  toKhmerDigits(num) {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num ?? '').split('').map(d => khmerDigits[parseInt(d, 10)] || d).join('');
  },

  // Parse Khmer solar date string (e.g. "ខេត្តព្រៃវែង, ថ្ងៃទី២១ ខែវិច្ឆិកា ឆ្នាំ២០២៤") to ISO "YYYY-MM-DD"
  parseKhmerSolarDateToISO(str) {
    if (!str || typeof str !== 'string') return '';
    const khmerMonths = {
      'មករា': 1, 'កុម្ភៈ': 2, 'មីនា': 3, 'មេសា': 4, 'ឧសភា': 5, 'មិថុនា': 6,
      'កក្កដា': 7, 'សីហា': 8, 'កញ្ញា': 9, 'តុលា': 10, 'វិច្ឆិកា': 11, 'ធ្នូ': 12
    };
    const norm = this.normalizeKhmerDigits(str);
    const mMatch = norm.match(/ថ្ងៃទី\s*(\d{1,2})\s*ខែ\s*([^\s,]+)\s*ឆ្នាំ\s*(\d{4})/);
    if (mMatch) {
      const day = parseInt(mMatch[1], 10);
      const monthName = mMatch[2].trim();
      const year = parseInt(mMatch[3], 10);
      const month = khmerMonths[monthName];
      if (day && month && year) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return '';
  },

  /* =========================================================
   * KHMER LUNAR CALENDAR (កាលទិនចន្ទគតិខ្មែរ តាមក្បួនសូរ្យយាត្រា)
   * ========================================================= */
  _getAharkun(y) {
    return Math.floor((y * 292207 + 499) / 800) + 4;
  },
  _getAharkunMod(y) {
    return (y * 292207 + 499) % 800;
  },
  _getAvoman(y) {
    const ahk = this._getAharkun(y);
    return (11 * ahk + 25) % 692;
  },
  _getBodithey(y) {
    const a = this._getAharkun(y);
    return (Math.floor((11 * a + 25) / 692) + a + 29) % 30;
  },
  _kromthupul(y) {
    return 800 - this._getAharkunMod(y);
  },
  _isKhmerSolarLeap(y) {
    return this._kromthupul(y) <= 207 ? 1 : 0;
  },
  _getBoditheyLeap(y) {
    const av = this._getAvoman(y), bo = this._getBodithey(y);
    let bl = (bo >= 25 || bo <= 5) ? 1 : 0;
    let al = this._isKhmerSolarLeap(y) ? (av <= 126 ? 1 : 0) : (av <= 137 ? (this._getAvoman(y + 1) === 0 ? 0 : 1) : 0);
    if (bo === 25 && this._getBodithey(y + 1) === 5) bl = 0;
    if (bo === 24 && this._getBodithey(y + 1) === 6) bl = 1;
    return (bl && al) ? 3 : (bl ? 1 : (al ? 2 : 0));
  },
  _getProtetinLeap(y) {
    const b = this._getBoditheyLeap(y);
    if (b === 3) return 1;
    if (b === 2 || b === 1) return b;
    if (this._getBoditheyLeap(y - 1) === 3) return 2;
    return 0;
  },
  _isKhmerLeapMonth(y) {
    return this._getProtetinLeap(y) === 1;
  },
  _isKhmerLeapDay(y) {
    return this._getProtetinLeap(y) === 2;
  },
  _getNumberOfDayInKhmerMonth(m, y) {
    if (m === 6 && this._isKhmerLeapDay(y)) return 30; // ជេដ្ឋ
    if (m === 12 || m === 13) return 30; // បឋមាសាឍ, ទុតិយាសាឍ
    return m % 2 === 0 ? 29 : 30;
  },
  _getNumberOfDayInKhmerYear(y) {
    const p = this._getProtetinLeap(y);
    if (p === 1) return 384;
    if (p === 2) return 355;
    return 354;
  },
  _getMaybeBEYear(dt) {
    return (dt.getMonth() + 1 <= 4) ? dt.getFullYear() + 543 : dt.getFullYear() + 544;
  },
  _nextMonthOf(m, y) {
    if (m === 6) return this._isKhmerLeapMonth(y) ? 12 : 7;
    if (m === 11) return 0;
    if (m === 12) return 13;
    if (m === 13) return 8;
    return m + 1;
  },
  _findLunarCoordinates(target) {
    const nt = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0));
    const em = new Date(Date.UTC(1900, 0, 1));
    let km = 1, kd = 0;
    while ((nt - em) / 864e5 > this._getNumberOfDayInKhmerYear(this._getMaybeBEYear(new Date(em.getTime() + 31536e6)))) {
      em.setUTCDate(em.getUTCDate() + this._getNumberOfDayInKhmerYear(this._getMaybeBEYear(new Date(em.getTime() + 31536e6))));
    }
    while ((nt - em) / 864e5 > this._getNumberOfDayInKhmerMonth(km, this._getMaybeBEYear(em))) {
      em.setUTCDate(em.getUTCDate() + this._getNumberOfDayInKhmerMonth(km, this._getMaybeBEYear(em)));
      km = this._nextMonthOf(km, this._getMaybeBEYear(em));
    }
    kd += Math.floor((nt - em) / 864e5);
    const tot = this._getNumberOfDayInKhmerMonth(km, this._getMaybeBEYear(nt));
    if (tot <= kd) {
      kd %= tot;
      km = this._nextMonthOf(km, this._getMaybeBEYear(em));
    }
    return { day: Math.floor(kd), month: km };
  },
  _getKhNewYearMoment(gregorianYear) {
    const isLeapYear = (gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || (gregorianYear % 400 === 0);
    const day = isLeapYear ? 13 : 14;
    let hoursOffset = ((gregorianYear - 2026) * 6) % 24;
    if (hoursOffset < 0) hoursOffset += 24;
    const hour = (10 + hoursOffset) % 24;
    return new Date(gregorianYear, 3, day, hour, 48);
  },
  _getAnimalYear(dt) {
    const y = dt.getFullYear();
    const ny = this._getKhNewYearMoment(y);
    return (dt.getTime() < ny.getTime()) ? (y + 543 + 4) % 12 : (y + 544 + 4) % 12;
  },
  _getJolakSakarajYear(dt) {
    const y = dt.getFullYear();
    const ny = this._getKhNewYearMoment(y);
    return (dt.getTime() < ny.getTime()) ? y + 543 - 1182 : y + 544 - 1182;
  },
  _getVisakhaBochea(gregorianYear) {
    const d = new Date(Date.UTC(gregorianYear, 0, 1));
    for (let i = 0; i < 365; i++) {
      const l = this._findLunarCoordinates(d);
      if (l.month === 5 && l.day === 14) return d;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return new Date(Date.UTC(gregorianYear, 4, 15));
  },
  _getBEYear(dt) {
    const vb = this._getVisakhaBochea(dt.getFullYear());
    return (dt.getTime() > vb.getTime()) ? dt.getFullYear() + 544 : dt.getFullYear() + 543;
  },
  getKhmerLunarDate(date) {
    if (!date) date = new Date();
    else if (typeof date === 'string') {
      const [y, m, d] = date.split('-').map(Number);
      date = new Date(y, m - 1, d);
    }
    const LUNAR_MONTH_NAMES = ['មិគសិរ', 'បុស្ស', 'មាឃ', 'ផល្គុន', 'ចេត្រ', 'ពិសាខ', 'ជេដ្ឋ', 'អាសាឍ', 'ស្រាពណ៍', 'ភទ្របទ', 'អស្សុជ', 'កត្តិក', 'បឋមាសាឍ', 'ទុតិយាសាឍ'];
    const ANIMAL_YEARS = ['ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់', 'មមី', 'មមែ', 'វក', 'រកា', 'ច', 'កុរ'];
    const ERA_YEARS = ['សំរឹទ្ធិស័ក', 'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក', 'បញ្ចស័ក', 'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក'];
    const WEEKDAYS = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

    const lunar = this._findLunarCoordinates(date);
    const moonStatus = lunar.day > 14 ? 'រោច' : 'កើត';
    const moonCount = (lunar.day % 15) + 1;
    const dayName = WEEKDAYS[date.getDay()];
    const monthName = LUNAR_MONTH_NAMES[lunar.month] || 'កត្តិក';
    const animalName = ANIMAL_YEARS[this._getAnimalYear(date)];
    const eraIndex = this._getJolakSakarajYear(date) % 10;
    const eraName = ERA_YEARS[eraIndex];
    const beYear = this._getBEYear(date);
    const beYearStr = this.toKhmerDigits(beYear);
    const moonCountStr = this.toKhmerDigits(moonCount);

    return {
      dayName,
      moonCount,
      moonStatus,
      phase: moonCountStr + moonStatus,
      lunarMonth: monthName,
      animalYear: animalName,
      era: eraName,
      beYear: beYearStr,
      formatted: `ថ្ងៃ${dayName} ${moonCountStr}${moonStatus} ខែ${monthName} ឆ្នាំ${animalName} ${eraName} ព.ស. ${beYearStr}`
    };
  },

  getKhmerSolarDate(date, province = '') {
    if (!date) date = new Date();
    else if (typeof date === 'string') {
      const [y, m, d] = date.split('-').map(Number);
      date = new Date(y, m - 1, d);
    }
    const khmerMonths = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
    const dayStr = this.toKhmerDigits(String(date.getDate()).padStart(2, '0'));
    const monthStr = khmerMonths[date.getMonth()];
    const yearStr = this.toKhmerDigits(date.getFullYear());
    const provPrefix = province ? `${province}, ` : '';
    return `${provPrefix}ថ្ងៃទី${dayStr} ខែ${monthStr} ឆ្នាំ${yearStr}`;
  },

  getTodayKhmerDates(province = '') {
    const now = new Date();
    const lunar = this.getKhmerLunarDate(now);
    const solar = this.getKhmerSolarDate(now, province);
    return {
      lunarDate: lunar.formatted,
      solarDate: solar,
      lunar,
      iso: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    };
  },

  // Parse grade level number (7, 8, 9, 10, 11, 12, etc.) from state, config, or string
  getGradeLevel(state) {
    if (!state && typeof window !== 'undefined' && window.App?.state) {
      state = window.App.state;
    }
    if (!state) return 12;
    if (typeof state === 'number') return state;
    if (typeof state === 'string') return this._parseGradeString(state);

    let raw = '';
    // 1. If App exists and has getActiveSchoolConfig, use active class config
    if (typeof window !== 'undefined' && window.App?.getActiveSchoolConfig) {
      try {
        const cfg = window.App.getActiveSchoolConfig();
        if (cfg) raw = String(cfg.grade || cfg.className || '');
      } catch(e){}
    }
    // 2. If state has classes and currentClassId, find current class
    if (!raw && Array.isArray(state.classes) && state.currentClassId) {
      const cls = state.classes.find(c => c.id === state.currentClassId);
      if (cls) raw = String(cls.grade || cls.name || cls.className || '');
    }
    // 3. Check directly passed config properties
    if (!raw && typeof state.grade !== 'undefined') {
      raw = String(state.grade);
    }
    if (!raw && typeof state.className !== 'undefined') {
      raw = String(state.className);
    }
    // 4. Fallback to schoolConfig
    if (!raw && state.schoolConfig) {
      raw = String(state.schoolConfig.grade || state.schoolConfig.className || '');
    }
    return this._parseGradeString(raw);
  },

  _parseGradeString(raw) {
    if (!raw) return 12;
    const norm = this.normalizeKhmerDigits(raw).toLowerCase().trim();
    if (norm === '12' || norm.includes('12')) return 12;
    if (norm === '11' || norm.includes('11')) return 11;
    if (norm === '10' || norm.includes('10')) return 10;
    if (norm === '9' || /(?:^|[^\d])9(?:[^\d]|$)/.test(norm) || norm.includes('ថ្នាក់ទី9') || norm.includes('ទី9') || norm.includes('ថ្នាក់9')) return 9;
    if (norm === '8' || /(?:^|[^\d])8(?:[^\d]|$)/.test(norm) || norm.includes('ថ្នាក់ទី8') || norm.includes('ទី8') || norm.includes('ថ្នាក់8')) return 8;
    if (norm === '7' || /(?:^|[^\d])7(?:[^\d]|$)/.test(norm) || norm.includes('ថ្នាក់ទី7') || norm.includes('ទី7') || norm.includes('ថ្នាក់7')) return 7;
    return 12;
  },

  // Check if current class/grade is Grade 12
  isGrade12(state) {
    return this.getGradeLevel(state) === 12;
  },

  // Check if current class/grade is Grade 9
  isGrade9(state) {
    return this.getGradeLevel(state) === 9;
  },

  // Check if period is a semester exam
  isSemesterExam(periodId) {
    return periodId === 'sem_1' || periodId === 'sem_2' || periodId === 'exam_sem_1' || periodId === 'exam_sem_2';
  },

  // Check if period is a Grade 9 Semester Exam
  isGrade9Exam(periodId, state) {
    return this.isGrade9(state) && this.isSemesterExam(periodId);
  },

  // Grade 9 Semester Exam Subjects & Maximum Scores & Coefficients
  // តែងសេចក្តី (60, coef 1.2), សរសេរតាមអាន (40, coef 0.8), សីលធម៌ (35, coef 0.7),
  // ប្រវត្តិ (33, coef 0.66), ភូមិ (32, coef 0.64), គណិត (100, coef 2.0),
  // រូប (35, coef 0.7), គីមី (25, coef 0.5), ជីវៈ (35, coef 0.7), ផែនដី (25, coef 0.5),
  // អង់គ្លេស (50, coef 0 - ដូចថ្នាក់ទី១២ >25 ទើបបូក)
  // មេគុណរួម = 8.4 (ផលបូកមេគុណ: 1.2+0.8+0.7+0.66+0.64+2.0+0.7+0.5+0.7+0.5 = 8.4)
  getGrade9ExamSubjects() {
    return [
      { id: 'khmer_essay', name: 'តែងសេចក្តី', shortName: 'តែង', max: 60, coef: 1.2, includeInTotal: true },
      { id: 'khmer_dictation', name: 'សរសេរតាមអាន', shortName: 'សរសេរ', max: 40, coef: 0.8, includeInTotal: true },
      { id: 'civics', name: 'សីលធម៌-ពលរដ្ឋ', shortName: 'សីលធម៌', max: 35, coef: 0.7, includeInTotal: true },
      { id: 'history', name: 'ប្រវត្តិវិទ្យា', shortName: 'ប្រវត្តិ', max: 33, coef: 0.66, includeInTotal: true },
      { id: 'geo', name: 'ភូមិវិទ្យា', shortName: 'ភូមិ', max: 32, coef: 0.64, includeInTotal: true },
      { id: 'math', name: 'គណិតវិទ្យា', shortName: 'គណិត', max: 100, coef: 2.0, includeInTotal: true },
      { id: 'physics', name: 'រូបវិទ្យា', shortName: 'រូប', max: 35, coef: 0.7, includeInTotal: true },
      { id: 'chemistry', name: 'គីមីវិទ្យា', shortName: 'គីមី', max: 25, coef: 0.5, includeInTotal: true },
      { id: 'biology', name: 'ជីវៈវិទ្យា', shortName: 'ជីវៈ', max: 35, coef: 0.7, includeInTotal: true },
      { id: 'earth', name: 'ផែនដីវិទ្យា', shortName: 'ផែនដី', max: 25, coef: 0.5, includeInTotal: true },
      { id: 'english', name: 'ភាសាអង់គ្លេស', shortName: 'អង់គ្លេស', max: 50, coef: 0, includeInTotal: true, isEnglishBonus: true }
    ];
  },

  // Helper to get effective subjects for a period
  getPeriodSubjects(periodId, state) {
    if (this.isGrade9Exam(periodId, state)) {
      return this.getGrade9ExamSubjects();
    }
    return (state && Array.isArray(state.subjects) && state.subjects.length > 0)
      ? state.subjects
      : [];
  },

  // Get list of subjects that were actually examined/tested by the teacher in a period
  // A subject is considered tested if at least one student has a valid score entered (> 0)
  // If the teacher did not test a subject (no scores entered), it is excluded from divisor calculation
  getTestedSubjects(subjects, periodScores = null, studentScore = null, students = null) {
    if (!Array.isArray(subjects) || subjects.length === 0) return [];
    const activeSubs = subjects.filter(s => s.includeInTotal !== false);

    const testedIds = new Set();

    // 1. Check class-wide periodScores for this period
    if (periodScores && typeof periodScores === 'object') {
      const validStudentIds = Array.isArray(students) && students.length > 0
        ? students.map(s => String(s.id))
        : Object.keys(periodScores);

      for (const sub of activeSubs) {
        let count = 0;
        for (const sid of validStudentIds) {
          const stObj = periodScores[sid];
          if (stObj) {
            const val = parseFloat(stObj[sub.id]);
            if (!isNaN(val) && val > 0) {
              count++;
            }
          }
        }
        // If at least one student in class has a score entered, the subject was tested by the teacher
        if (count > 0) {
          testedIds.add(sub.id);
        }
      }
    }

    // 2. Also check studentScore (if provided e.g. for row-level edits or fallback)
    if (studentScore && typeof studentScore === 'object') {
      for (const sub of activeSubs) {
        const val = parseFloat(studentScore[sub.id]);
        if (!isNaN(val) && val > 0) {
          testedIds.add(sub.id);
        }
      }
    }

    // If at least one tested subject is identified, return ONLY those tested subjects
    if (testedIds.size > 0) {
      return activeSubs.filter(s => testedIds.has(s.id));
    }

    // Fallback if no scores are entered yet across the period
    return activeSubs;
  },

  // Sum of subject coefficients
  // Rules:
  // 1. If isGrade12Exam, divisor is ALWAYS 12.50 (for Grade 12 Semester Exams: sem_1, sem_2)
  // 2. For Monthly Exam: ONLY count subjects that the teacher has actually examined/tested!
  // 3. ONLY for Grade 12 (Monthly): English coefficient is NOT counted (មេគុណ = 0)
  //    For other grades (Grade 7, 8, 9, 10, 11): English coefficient is counted normally (e.g. max 50 = coef 1, max 100 = coef 2)
  // 4. Collective class divisor (មេគុណគិតរួម): Divisor is fixed for the tested subjects in that period,
  //    even if a student has no score in a subject, their divisor remains identical to others with scores.
  // Sum of subject coefficients
  // Rules:
  // 1. Only count subjects that the teacher actually tested! Untested subjects do NOT count in divisor.
  // 2. Grade 12 (Monthly & Exam) and Grade 9 (Exam): English coefficient is NOT counted (មេគុណ = 0, bonus points > 25 added to total)
  //    For other grades (Grade 7, 8, 9 monthly, 10, 11): English coefficient is counted normally if tested
  // 3. For Grade 9 Semester Exam: Divisor is ALWAYS 8.4 (ផលបូកមេគុណមុខវិជ្ជាទាំង ១០ = 8.4)
  // 4. If Grade 12 exam and all active subjects were tested, respect custom rules.grade12ExamDivisor if defined
  getTotalCoefficient(subjects, studentScore = null, isGrade12Exam = false, rules = null, isG12 = null, periodScores = null, students = null, isGrade9Exam = false) {
    if (!Array.isArray(subjects) || subjects.length === 0) return 0;

    // Auto-resolve isG12 if not explicitly passed as a boolean
    if (typeof isG12 !== 'boolean') {
      isG12 = this.isGrade12(typeof window !== 'undefined' ? window.App?.state : null);
    }
    // Auto-resolve isGrade9Exam if not explicitly passed
    if (typeof isGrade9Exam !== 'boolean') {
      const st = typeof window !== 'undefined' ? window.App?.state : null;
      isGrade9Exam = this.isGrade9(st) && (subjects.some(s => s.id === 'khmer_essay' || s.id === 'khmer_dictation'));
    }
    if (!isGrade9Exam && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      const st = window.App.state;
      if (curPeriod && this.isGrade9Exam(curPeriod, st)) {
        isGrade9Exam = true;
      }
    }
    // Auto-resolve isGrade12Exam if not explicitly passed
    if (!isGrade12Exam && isG12 && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      if (curPeriod && this.isSemesterExam(curPeriod)) {
        isGrade12Exam = true;
      }
    }

    if (isGrade9Exam) {
      if (rules && typeof rules.grade9ExamDivisor === 'number') {
        return rules.grade9ExamDivisor;
      }
      return 8.4;
    }

    if (isGrade12Exam) {
      if (rules && typeof rules.grade12ExamDivisor === 'number') {
        return rules.grade12ExamDivisor;
      }
      return 12.5;
    }

    // Filter to subjects that were actually examined/tested by the teacher
    const testedSubs = this.getTestedSubjects(subjects, periodScores, studentScore, students);

    // Filter active subjects. Exclude English for Grade 12 (isG12 === true) or Grade 9 Exam
    // For other grades (Grade 7, 8, 9 monthly, 10, 11), English has a normal coefficient (counted in divisor)
    const activeSubs = testedSubs.filter(s => {
      if (s.includeInTotal === false) return false;
      if ((isG12 || isGrade9Exam) && this.isEnglishSubject(s) && (rules?.applyEnglishBonusRule !== false)) return false;
      return true;
    });

    // If Grade 12 Semester Exam and ALL active subjects were tested, respect custom rules.grade12ExamDivisor if configured
    const allActiveSubs = subjects.filter(s => s.includeInTotal !== false && !(isG12 && this.isEnglishSubject(s) && (rules?.applyEnglishBonusRule !== false)));
    if (isGrade12Exam && activeSubs.length === allActiveSubs.length && rules && typeof rules.grade12ExamDivisor === 'number') {
      return rules.grade12ExamDivisor;
    }

    const totalCoef = activeSubs.reduce((sum, s) => {
      const c = parseFloat(s.coef);
      const coefVal = (!isNaN(c) && c > 0) ? c : (s.max ? (parseFloat(s.max) / 50) : 1.0);
      return sum + coefVal;
    }, 0);
    return parseFloat(totalCoef.toFixed(2));
  },

  // Calculate total score for a student in a period
  // Rules (MoEYS Standard):
  // - Grade 12 & Grade 9 Semester Exam: English is an elective/bonus subject.
  //   Only points above 25 (score > 25) are added as bonus: (score - 25).
  //   If score <= 25, contributes 0 (do not add).
  // - Grade 9 Exam Khmer Split: តែងសេចក្តី (max 60) + សរសេរតាមអាន (max 40)
  // - For Other Grades (Grade 7, 8, 9 monthly, 10, 11): English score is added normally (total += val) without subtracting 25!
  calculateTotal(studentScore, subjects, rules = null, isG12 = null, isGrade12Exam = false, isGrade9Exam = false) {
    if (!studentScore) return 0;
    // If student score already has an explicit total from Excel and no individual subjects
    if (studentScore.total !== undefined && studentScore.total > 0 && !studentScore.khmer && !studentScore.math && !studentScore.khmer_essay) {
      return parseFloat(studentScore.total.toFixed(2));
    }

    // Auto-resolve isG12 if not explicitly passed as a boolean
    if (typeof isG12 !== 'boolean') {
      isG12 = this.isGrade12(typeof window !== 'undefined' ? window.App?.state : null);
    }
    // Auto-resolve isGrade9Exam if not explicitly passed
    if (typeof isGrade9Exam !== 'boolean') {
      const st = typeof window !== 'undefined' ? window.App?.state : null;
      isGrade9Exam = this.isGrade9(st) && Array.isArray(subjects) && (subjects.some(s => s.id === 'khmer_essay' || s.id === 'khmer_dictation'));
    }
    if (!isGrade9Exam && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      const st = window.App.state;
      if (curPeriod && this.isGrade9Exam(curPeriod, st)) {
        isGrade9Exam = true;
      }
    }
    // Auto-resolve isGrade12Exam if not explicitly passed
    if (!isGrade12Exam && isG12 && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      if (curPeriod && this.isSemesterExam(curPeriod)) {
        isGrade12Exam = true;
      }
    }

    let total = 0;
    let hasSubScore = false;
    const activeSubs = Array.isArray(subjects) ? subjects.filter(s => s.includeInTotal !== false) : [];
    const engThreshold = (rules && typeof rules.englishBonusThreshold === 'number') ? rules.englishBonusThreshold : 25;

    activeSubs.forEach(sub => {
      let raw = studentScore[sub.id];
      if ((raw === undefined || raw === null || raw === '' || raw === 0) && (sub.id === 'khmer' || /ខ្មែរ/i.test(sub.name))) {
        const essay = parseFloat(studentScore.khmer_essay) || 0;
        const dict = parseFloat(studentScore.khmer_dictation) || 0;
        if (essay > 0 || dict > 0) {
          raw = essay + dict;
        }
      }
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) {
        hasSubScore = true;
        // MoEYS English bonus threshold rule:
        // For Grade 12 or Grade 9 Semester Exam:
        // English only counts points above 25 as bonus (score - 25); if score <= 25, contributes 0 (do not add to total)
        // For other grades/monthly: English score is added normally (total += val) without subtracting 25!
        const isBonusEng = (isG12 || isGrade12Exam || isGrade9Exam) && this.isEnglishSubject(sub) && (rules?.applyEnglishBonusRule !== false);
        if (isBonusEng) {
          if (val > engThreshold) {
            total += (val - engThreshold);
          }
          // If val <= engThreshold (<= 25), contributes 0 (do not add to total)
        } else {
          total += val;
        }
      }
    });

    // Fallback for Grade 9 Exam if student has combined 'khmer' score instead of separate 'khmer_essay' and 'khmer_dictation'
    if (isGrade9Exam && studentScore.khmer && !studentScore.khmer_essay && !studentScore.khmer_dictation) {
      const val = parseFloat(studentScore.khmer);
      if (!isNaN(val) && val > 0) {
        hasSubScore = true;
        total += val;
      }
    }

    if (!hasSubScore && studentScore.total) {
      return parseFloat(studentScore.total);
    }
    return parseFloat(total.toFixed(2));
  },

  // Calculate average with configurable formula and decimal precision
  // Rules:
  // 1. Grade 9 semester exam: ALWAYS total / 8.4 (ផលបូកមេគុណ 8.4)
  // 2. Grade 12 semester exam: ALWAYS total / 12.50
  // 3. Monthly: total / sum of coefficients of tested subjects (excluding English only in Grade 12)
  //    For other grades: English coefficient is included in the divisor
  // 4. Monthly averages are NOT rounded to integer; they keep standard decimal precision
  calculateAverage(total, subjects, studentScore = null, rules = null, isGrade12Exam = false, isG12 = null, periodScores = null, isGrade9Exam = false) {
    if (studentScore && studentScore.avg && studentScore.avg > 0 && (!studentScore.khmer || studentScore.khmer === 0) && (!studentScore.khmer_essay || studentScore.khmer_essay === 0)) {
      const dec = (rules && typeof rules.decimalPlaces === 'number') ? rules.decimalPlaces : 2;
      return parseFloat(studentScore.avg.toFixed(dec));
    }
    if (!total || total <= 0) return 0;

    // Auto-resolve isG12 if not explicitly passed as a boolean
    if (typeof isG12 !== 'boolean') {
      isG12 = this.isGrade12(typeof window !== 'undefined' ? window.App?.state : null);
    }
    // Auto-resolve isGrade9Exam if not explicitly passed
    if (typeof isGrade9Exam !== 'boolean') {
      const st = typeof window !== 'undefined' ? window.App?.state : null;
      isGrade9Exam = this.isGrade9(st) && Array.isArray(subjects) && (subjects.some(s => s.id === 'khmer_essay' || s.id === 'khmer_dictation'));
    }
    if (!isGrade9Exam && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      const st = window.App.state;
      if (curPeriod && this.isGrade9Exam(curPeriod, st)) {
        isGrade9Exam = true;
      }
    }
    // Auto-resolve isGrade12Exam if not explicitly passed
    if (!isGrade12Exam && isG12 && typeof window !== 'undefined' && window.App) {
      const curPeriod = window.App.currentMonthId || window.App.quickScoreMonthId || window.App.rankingMonthId;
      if (curPeriod && this.isSemesterExam(curPeriod)) {
        isGrade12Exam = true;
      }
    }

    if (isGrade9Exam) {
      const div = (rules && typeof rules.grade9ExamDivisor === 'number') ? rules.grade9ExamDivisor : 8.4;
      const dec = (rules && typeof rules.decimalPlaces === 'number') ? rules.decimalPlaces : 2;
      return parseFloat((total / div).toFixed(dec));
    }

    if (isGrade12Exam) {
      const div = (rules && typeof rules.grade12ExamDivisor === 'number') ? rules.grade12ExamDivisor : 12.5;
      const dec = (rules && typeof rules.decimalPlaces === 'number') ? rules.decimalPlaces : 2;
      return parseFloat((total / div).toFixed(dec));
    }

    let avg = 0;
    if (rules && rules.monthlyFormula === 'count') {
      const testedSubs = this.getTestedSubjects(subjects, periodScores, studentScore);
      const activeSubs = testedSubs.filter(s => {
        if (s.includeInTotal === false) return false;
        if (isG12 && this.isEnglishSubject(s) && (rules?.applyEnglishBonusRule !== false)) return false;
        return true;
      });
      const count = activeSubs.length;
      if (count === 0) return 0;
      avg = total / count;
    } else {
      // Divisor is strictly the sum of coefficients of subjects actually tested by the teacher
      const totalCoef = this.getTotalCoefficient(subjects, studentScore, isGrade12Exam, rules, isG12, periodScores, null, isGrade9Exam);
      if (totalCoef === 0) return 0;
      avg = total / totalCoef;
    }

    const dec = (rules && typeof rules.decimalPlaces === 'number') ? rules.decimalPlaces : 2;
    return parseFloat(avg.toFixed(dec));
  },

  // Format average with configurable decimal places (e.g. 12.32, 45.00)
  formatAvg(val, rules = null) {
    if (val === null || val === undefined || val === '' || val === '-') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    const dec = (rules && typeof rules.decimalPlaces === 'number') ? rules.decimalPlaces : 2;
    return num.toFixed(dec);
  },

  // Format total score as integer (e.g. 581, 591)
  formatTotal(val) {
    if (val === null || val === undefined || val === '' || val === '-') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return Math.round(num).toString();
  },

  // Format subject score (e.g. 50, 42.5)
  formatScore(val) {
    if (val === null || val === undefined || val === '' || val === '-') return '';
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    return (num % 1 === 0) ? num.toString() : num.toFixed(1).replace(/\.0$/, '');
  },

  // Get Letter Grade and Khmer Mention with configurable thresholds
  getGradeAndMention(average, rules = null) {
    if (average === null || average === undefined || isNaN(average) || average <= 0) {
      return { grade: '', mention: 'មិនចាត់ថ្នាក់', pass: false, colorClass: 'badge-gray' };
    }

    const gA = (rules && typeof rules.gradeA === 'number') ? rules.gradeA : 45;
    const gB = (rules && typeof rules.gradeB === 'number') ? rules.gradeB : 40;
    const gC = (rules && typeof rules.gradeC === 'number') ? rules.gradeC : 35;
    const gD = (rules && typeof rules.gradeD === 'number') ? rules.gradeD : 30;
    const gE = (rules && typeof rules.gradeE === 'number') ? rules.gradeE : 25;
    const passMark = (rules && typeof rules.passScore === 'number') ? rules.passScore : 25;

    const pass = (average >= passMark);

    if (average >= gA) {
      return { grade: 'A', mention: 'ល្អប្រសើរ', pass, colorClass: 'badge-red' };
    } else if (average >= gB) {
      return { grade: 'B', mention: 'ល្អណាស់', pass, colorClass: 'badge-purple' };
    } else if (average >= gC) {
      return { grade: 'C', mention: 'ល្អ', pass, colorClass: 'badge-maroon' };
    } else if (average >= gD) {
      return { grade: 'D', mention: 'ល្អបង្គួរ', pass, colorClass: 'badge-green' };
    } else if (average >= gE) {
      return { grade: 'E', mention: 'មធ្យម', pass, colorClass: 'badge-blue' };
    } else {
      return { grade: 'F', mention: 'ខ្សោយ', pass: false, colorClass: 'badge-red' };
    }
  },

  getGradeColor(grade) {
    if (!grade) return '#0f172a';
    const g = String(grade).trim().toUpperCase();
    const map = {
      'A': '#dc2626',
      'B': '#9333ea',
      'C': '#881337',
      'D': '#15803d',
      'E': '#1d4ed8',
      'F': '#dc2626'
    };
    return map[g] || '#0f172a';
  },

  // Teacher remarks based on annual average and class grade level
  getTeacherRemark(annualAverage, state = null, rules = null) {
    if (annualAverage === null || annualAverage === undefined || isNaN(annualAverage) || annualAverage <= 0) {
      return 'គ្មានលទ្ធផល';
    }

    const passMark = (rules && typeof rules.passScore === 'number') ? rules.passScore : 25;
    const isPass = annualAverage >= passMark;

    if (isPass) {
      const gradeLevel = this.getGradeLevel(state);
      if (gradeLevel === 9) {
        return 'មានសិទ្ធិប្រឡងសញ្ញាបត្របឋមភូមិ';
      } else if (gradeLevel === 12) {
        return 'មានសិទ្ធិប្រឡងសញ្ញាបត្រទុតិយភូមិ';
      } else {
        // Grades 7, 8, 10, 11 (ថ្នាក់ទី ៧, ៨, ១០, ១១)
        return 'ត្រូវបានឡើងថ្នាក់';
      }
    } else if (annualAverage >= 1) {
      return 'ត្រូវប្រឡងឡើងថ្នាក់';
    } else {
      return 'ត្រូវរៀនត្រួតថ្នាក់';
    }
  },

  // Calculate competition ranks (1, 2, 2, 4...) identical to Excel RANK()
  calculateRanks(records, scoreField = 'avg') {
    const sorted = [...records].sort((a, b) => {
      const valA = parseFloat(a[scoreField]) || 0;
      const valB = parseFloat(b[scoreField]) || 0;
      return valB - valA;
    });

    const rankMap = new Map();
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      const score = parseFloat(sorted[i][scoreField]) || 0;
      if (score <= 0) {
        rankMap.set(sorted[i].id, '-');
        continue;
      }

      if (i > 0) {
        const prevScore = parseFloat(sorted[i - 1][scoreField]) || 0;
        if (score === prevScore) {
          rankMap.set(sorted[i].id, rankMap.get(sorted[i - 1].id));
        } else {
          currentRank = i + 1;
          rankMap.set(sorted[i].id, currentRank);
        }
      } else {
        rankMap.set(sorted[i].id, 1);
      }
    }

    return rankMap;
  },

  // Calculate complete period data (all students in one month/exam)
  computePeriodData(periodId, state) {
    const periodScores = state.scoresByPeriod[periodId] || {};
    const historicalRankings = state.monthlyRankings?.[periodId] || [];
    const isG12 = this.isGrade12(state);
    const isG9 = this.isGrade9(state);
    const isExam = this.isSemesterExam(periodId);
    const isGrade12Exam = isG12 && isExam;
    const isGrade9Exam = isG9 && isExam;

    const subjects = isGrade9Exam ? this.getGrade9ExamSubjects() : state.subjects;
    const rules = state.gradingRules || state.schoolConfig?.gradingRules;

    // Period collective divisor:
    // Strictly 8.4 for Grade 9 Semester Exam, or 12.5 for Grade 12 Semester Exam, or sum of coefficients of subjects actually tested by the teacher
    const periodDivisor = isGrade9Exam
      ? ((rules && typeof rules.grade9ExamDivisor === 'number') ? rules.grade9ExamDivisor : 8.4)
      : (isGrade12Exam
          ? ((rules && typeof rules.grade12ExamDivisor === 'number') ? rules.grade12ExamDivisor : 12.5)
          : this.getTotalCoefficient(subjects, null, isGrade12Exam, rules, isG12, periodScores, state.students, isGrade9Exam));

    const list = state.students.map(st => {
      const scoreObj = periodScores[st.id] || {};
      const hist = historicalRankings.find(h => h.id === st.id);

      let total = 0;
      let avg = 0;
      let grade = '';
      let rank = null;

      // Check if student has actual subject scores
      const hasSubjectScores = subjects && subjects.some(sub => {
        const v = parseFloat(scoreObj[sub.id]);
        return !isNaN(v) && v > 0;
      });
      const hasLegacyKhmer = isGrade9Exam && parseFloat(scoreObj['khmer']) > 0;

      // If scores are present in scoreObj, calculate dynamically. Only fall back to historical sheet if scoreObj is populated
      if (hasSubjectScores || hasLegacyKhmer) {
        total = this.calculateTotal(scoreObj, subjects, rules, isG12, isGrade12Exam, isGrade9Exam);
        avg = this.calculateAverage(total, subjects, scoreObj, rules, isGrade12Exam, isG12, periodScores, isGrade9Exam);
      } else if (hist && hist.total > 0 && Object.keys(scoreObj).length > 0) {
        total = hist.total;
        avg = parseFloat(Number(hist.avg).toFixed(2));
        grade = hist.grade;
        rank = hist.rank;
      } else if (scoreObj && scoreObj.total > 0) {
        total = scoreObj.total;
        const div = periodDivisor || (isGrade9Exam ? 8.4 : 12.50);
        avg = parseFloat(scoreObj.avg ? Number(scoreObj.avg).toFixed(2) : (total / div).toFixed(2));
        grade = scoreObj.grade || '';
        rank = scoreObj.rank || null;
      }

      const { grade: calcGrade, mention, pass, colorClass } = this.getGradeAndMention(avg, rules);

      // Auto-combine Khmer essay + dictation into khmer score if khmer is not explicitly set
      const essayVal = parseFloat(scoreObj.khmer_essay) || 0;
      const dictVal = parseFloat(scoreObj.khmer_dictation) || 0;
      const effectiveScores = { ...scoreObj };
      if ((essayVal > 0 || dictVal > 0) && (!scoreObj.khmer || scoreObj.khmer === 0)) {
        effectiveScores.khmer = essayVal + dictVal;
      }

      // Check for explicit locked rank (e.g. from Grace Marks or manual lock)
      const explicitLockedRank = (scoreObj.lockedRank !== undefined && scoreObj.lockedRank !== null && scoreObj.lockedRank !== '')
        ? scoreObj.lockedRank
        : ((scoreObj.fixedRank !== undefined && scoreObj.fixedRank !== null && scoreObj.fixedRank !== '')
          ? scoreObj.fixedRank
          : (hist && hist.rank && hist.rank !== '-' ? hist.rank : null));

      return {
        id: st.id,
        name: st.name,
        gender: st.gender,
        scores: effectiveScores,
        total,
        avg,
        grade: grade || calcGrade,
        mention,
        pass,
        colorClass,
        fixedRank: explicitLockedRank || rank,
        divisor: periodDivisor
      };
    });

    // Compute ranks: prioritize total score for ranking so students with different totals don't tie when rounded average is identical
    const rankField = list.some(item => typeof item.total === 'number' && item.total > 0) ? 'total' : 'avg';
    const rankMap = this.calculateRanks(list, rankField);
    list.forEach(item => {
      // Prioritize explicit locked/fixed rank if provided so rankings strictly never change after grace marks
      if (item.fixedRank && item.fixedRank !== '-') {
        item.rank = item.fixedRank;
      } else {
        item.rank = (list.length > historicalRankings.length)
          ? (rankMap.get(item.id) || item.fixedRank || '-')
          : (item.fixedRank || rankMap.get(item.id) || '-');
      }
    });

    return list;
  },

  // Sort monthly ranking records by specific criteria
  sortRankingData(records, sortBy = 'rank', sortOrder = 'asc') {
    const orderMult = sortOrder === 'desc' ? -1 : 1;

    return [...records].sort((a, b) => {
      if (sortBy === 'rank') {
        const rankA = a.rank === '-' ? 9999 : parseInt(a.rank, 10);
        const rankB = b.rank === '-' ? 9999 : parseInt(b.rank, 10);
        return (rankA - rankB) * orderMult;
      } else if (sortBy === 'id') {
        return (a.id - b.id) * orderMult;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'km') * orderMult;
      } else if (sortBy === 'gender') {
        // Female (ស) first or Male (ប) first
        return a.gender.localeCompare(b.gender, 'km') * orderMult;
      } else if (sortBy === 'total') {
        return (a.total - b.total) * orderMult;
      } else if (sortBy === 'avg') {
        return (a.avg - b.avg) * orderMult;
      } else if (sortBy === 'grade') {
        const gradeRank = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, '': 7 };
        return ((gradeRank[a.grade] || 7) - (gradeRank[b.grade] || 7)) * orderMult;
      }
      return 0;
    });
  },

  // Check if actual subject scores have been entered for a period (e.g. sem_1, sem_2)
  hasPeriodEnteredScores(periodId, state) {
    if (!state || !state.scoresByPeriod) return false;
    const pScores = state.scoresByPeriod[periodId];
    if (!pScores || typeof pScores !== 'object') return false;
    const subjects = this.isGrade9Exam(periodId, state) ? this.getGrade9ExamSubjects() : (state.subjects || []);
    const students = state.students || [];

    const studentList = students.length > 0 ? students : Object.keys(pScores).map(id => ({ id }));
    if (studentList.length === 0) return false;

    let testedCount = 0;
    for (const st of studentList) {
      const stObj = pScores[st.id];
      if (!stObj || typeof stObj !== 'object') continue;
      const hasSubjectScore = subjects.some(sub => {
        const val = parseFloat(stObj[sub.id]);
        return !isNaN(val) && val > 0;
      });
      const hasLegacyKhmer = this.isGrade9Exam(periodId, state) && parseFloat(stObj['khmer']) > 0;
      const hasTotalScore = typeof stObj.total === 'number' && stObj.total > 0;
      if (hasSubjectScore || hasLegacyKhmer || hasTotalScore) {
        testedCount++;
      }
    }

    return testedCount > 0;
  },

  // Get Semester or Annual Ranking Records - ALWAYS includes ALL students from state.students
  computeSemesterRankingData(termType = 'sem_1', state) {
    let rawList = [];
    const students = state.students || [];
    const rules = state.gradingRules || state.schoolConfig?.gradingRules;

    if (termType === 'exam_sem_1') {
      const hasExam = this.hasPeriodEnteredScores('sem_1', state);
      if (!hasExam) {
        return students.map(st => ({
          id: st.id,
          name: st.name,
          gender: st.gender,
          m1: '-',
          m2: '-',
          avg: '-',
          rank: '-',
          grade: '-',
          mention: 'មិនទាន់បញ្ចូលពិន្ទុ',
          pass: false,
          colorClass: ''
        }));
      }
      const pData = this.computePeriodData('sem_1', state);
      return pData.map(item => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        m1: item.total, // ពិន្ទុសរុប
        m2: item.avg,   // មធ្យមភាគ
        avg: item.avg,
        rank: item.rank,
        grade: item.grade,
        mention: item.mention,
        pass: item.pass,
        colorClass: item.colorClass
      }));
    } else if (termType === 'exam_sem_2') {
      const hasExam = this.hasPeriodEnteredScores('sem_2', state);
      if (!hasExam) {
        return students.map(st => ({
          id: st.id,
          name: st.name,
          gender: st.gender,
          m1: '-',
          m2: '-',
          avg: '-',
          rank: '-',
          grade: '-',
          mention: 'មិនទាន់បញ្ចូលពិន្ទុ',
          pass: false,
          colorClass: ''
        }));
      }
      const pData = this.computePeriodData('sem_2', state);
      return pData.map(item => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        m1: item.total, // ពិន្ទុសរុប
        m2: item.avg,   // មធ្យមភាគ
        avg: item.avg,
        rank: item.rank,
        grade: item.grade,
        mention: item.mention,
        pass: item.pass,
        colorClass: item.colorClass
      }));
    } else if (termType === 'sem_1') {
      const hasExam = this.hasPeriodEnteredScores('sem_1', state);
      const summaries = this.computeAllYearSummaries(state);
      const sumMap = new Map(summaries.map(s => [s.id, s]));

      rawList = students.map(st => {
        const summ = sumMap.get(st.id);

        let m1 = (summ && typeof summ.sem1MonthlyAvg === 'number' && summ.sem1MonthlyAvg > 0) ? summ.sem1MonthlyAvg : '-';
        let m2 = (hasExam && summ && typeof summ.sem1ExamAvg === 'number' && summ.sem1ExamAvg > 0) ? summ.sem1ExamAvg : '-';
        let avg = (hasExam && summ && typeof summ.sem1Avg === 'number' && summ.sem1Avg > 0) ? summ.sem1Avg : '-';
        let rawAvg = (hasExam && summ && typeof summ.rawSem1Avg === 'number' && summ.rawSem1Avg > 0) ? summ.rawSem1Avg : (typeof avg === 'number' ? avg : 0);
        let rank = '-';
        let grade = '-';
        let mention = hasExam ? 'មិនចាត់ថ្នាក់' : 'រង់ចាំពិន្ទុប្រឡងឆមាស';
        let pass = false;
        let colorClass = '';

        if (hasExam && typeof avg === 'number' && avg > 0) {
          const gm = this.getGradeAndMention(avg, rules);
          grade = gm.grade;
          mention = gm.mention;
          pass = gm.pass;
          colorClass = gm.colorClass;
        }

        return {
          id: st.id,
          name: st.name,
          gender: st.gender,
          m1,
          rawM1: (summ && typeof summ.rawS1MonthlyAvg === 'number') ? summ.rawS1MonthlyAvg : m1,
          m2,
          avg,
          rawAvg,
          rank,
          grade,
          mention,
          pass,
          colorClass,
          testedMonthsCount: summ?.sem1TestedMonthsCount || 0
        };
      });

      if (hasExam && rawList.some(r => typeof r.avg === 'number' && r.avg > 0)) {
        const rankMap = this.calculateRanks(rawList, 'rawAvg');
        rawList.forEach(r => {
          r.rank = rankMap.get(r.id) || '-';
        });
      }
    } else if (termType === 'sem_2') {
      const hasExam = this.hasPeriodEnteredScores('sem_2', state);
      const summaries = this.computeAllYearSummaries(state);
      const sumMap = new Map(summaries.map(s => [s.id, s]));

      rawList = students.map(st => {
        const summ = sumMap.get(st.id);

        let m1 = (summ && typeof summ.sem2MonthlyAvg === 'number' && summ.sem2MonthlyAvg > 0) ? summ.sem2MonthlyAvg : '-';
        let m2 = (hasExam && summ && typeof summ.sem2ExamAvg === 'number' && summ.sem2ExamAvg > 0) ? summ.sem2ExamAvg : '-';
        let avg = (hasExam && summ && typeof summ.sem2Avg === 'number' && summ.sem2Avg > 0) ? summ.sem2Avg : '-';
        let rawAvg = (hasExam && summ && typeof summ.rawSem2Avg === 'number' && summ.rawSem2Avg > 0) ? summ.rawSem2Avg : (typeof avg === 'number' ? avg : 0);
        let rank = '-';
        let grade = '-';
        let mention = hasExam ? 'មិនចាត់ថ្នាក់' : 'រង់ចាំពិន្ទុប្រឡងឆមាស';
        let pass = false;
        let colorClass = '';

        if (hasExam && typeof avg === 'number' && avg > 0) {
          const gm = this.getGradeAndMention(avg, rules);
          grade = gm.grade;
          mention = gm.mention;
          pass = gm.pass;
          colorClass = gm.colorClass;
        }

        return {
          id: st.id,
          name: st.name,
          gender: st.gender,
          m1,
          rawM1: (summ && typeof summ.rawS2MonthlyAvg === 'number') ? summ.rawS2MonthlyAvg : m1,
          m2,
          avg,
          rawAvg,
          rank,
          grade,
          mention,
          pass,
          colorClass,
          testedMonthsCount: summ?.sem2TestedMonthsCount || 0
        };
      });

      if (hasExam && rawList.some(r => typeof r.avg === 'number' && r.avg > 0)) {
        const rankMap = this.calculateRanks(rawList, 'rawAvg');
        rawList.forEach(r => {
          r.rank = rankMap.get(r.id) || '-';
        });
      }
    } else if (termType === 'year') {
      const summaries = this.computeAllYearSummaries(state);
      const sumMap = new Map(summaries.map(s => [s.id, s]));

      rawList = students.map(st => {
        const summ = sumMap.get(st.id);
        const m1 = (summ && typeof summ.sem1Avg === 'number' && summ.sem1Avg > 0) ? summ.sem1Avg : '-';
        const m2 = (summ && typeof summ.sem2Avg === 'number' && summ.sem2Avg > 0) ? summ.sem2Avg : '-';
        const avg = (summ && typeof summ.yearAvg === 'number' && summ.yearAvg > 0) ? summ.yearAvg : '-';
        const rawAvg = (summ && typeof summ.rawYearAvg === 'number' && summ.rawYearAvg > 0) ? summ.rawYearAvg : (typeof avg === 'number' ? avg : 0);
        let grade = '-';
        let mention = 'មិនចាត់ថ្នាក់';
        let pass = false;
        let colorClass = '';
        let remark = '-';

        if (typeof avg === 'number' && avg > 0) {
          const gm = this.getGradeAndMention(avg, rules);
          grade = gm.grade;
          mention = gm.mention;
          pass = gm.pass;
          colorClass = gm.colorClass;
          remark = this.getTeacherRemark(avg, state, rules);
        }

        return {
          id: st.id,
          name: st.name,
          gender: st.gender,
          m1,
          m2,
          avg,
          rawAvg,
          rank: '-',
          grade,
          mention,
          pass,
          colorClass,
          remark
        };
      });

      if (rawList.some(r => typeof r.avg === 'number' && r.avg > 0)) {
        const rankMap = this.calculateRanks(rawList, 'rawAvg');
        rawList.forEach(r => {
          r.rank = rankMap.get(r.id) || '-';
        });
      }
    }

    return rawList;
  },

  // Sort semester ranking records
  sortSemesterRankingData(records, sortBy = 'rank', sortOrder = 'asc') {
    const orderMult = sortOrder === 'desc' ? -1 : 1;

    return [...records].sort((a, b) => {
      if (sortBy === 'rank') {
        const rankA = (a.rank === '-' || a.rank === null || a.rank === undefined) ? 9999 : parseInt(a.rank, 10);
        const rankB = (b.rank === '-' || b.rank === null || b.rank === undefined) ? 9999 : parseInt(b.rank, 10);
        return (rankA - rankB) * orderMult;
      } else if (sortBy === 'id') {
        return (a.id - b.id) * orderMult;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'km') * orderMult;
      } else if (sortBy === 'gender') {
        return a.gender.localeCompare(b.gender, 'km') * orderMult;
      } else if (sortBy === 'avg') {
        const avgA = (typeof a.avg === 'number') ? a.avg : (parseFloat(a.avg) || 0);
        const avgB = (typeof b.avg === 'number') ? b.avg : (parseFloat(b.avg) || 0);
        return (avgA - avgB) * orderMult;
      } else if (sortBy === 'm1') {
        const m1A = (typeof a.m1 === 'number') ? a.m1 : (parseFloat(a.m1) || 0);
        const m1B = (typeof b.m1 === 'number') ? b.m1 : (parseFloat(b.m1) || 0);
        if (m1A !== m1B) return (m1A - m1B) * orderMult;
        const rawA = (typeof a.rawM1 === 'number') ? a.rawM1 : m1A;
        const rawB = (typeof b.rawM1 === 'number') ? b.rawM1 : m1B;
        return (rawA - rawB) * orderMult;
        return (m1A - m1B) * orderMult;
      } else if (sortBy === 'm2') {
        const m2A = (typeof a.m2 === 'number') ? a.m2 : (parseFloat(a.m2) || 0);
        const m2B = (typeof b.m2 === 'number') ? b.m2 : (parseFloat(b.m2) || 0);
        return (m2A - m2B) * orderMult;
      } else if (sortBy === 'grade') {
        const gradeRank = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, '': 7, '-': 8 };
        return ((gradeRank[a.grade] || 8) - (gradeRank[b.grade] || 8)) * orderMult;
      }
      return 0;
    });
  },

  // Compute monthly statistics (A, B, C, D, E, F counts, and Good, Fair, Medium, Weak)
  computeMonthlyStats(records) {
    const stats = {
      grades: {
        A: { total: 0, female: 0 },
        B: { total: 0, female: 0 },
        C: { total: 0, female: 0 },
        D: { total: 0, female: 0 },
        E: { total: 0, female: 0 },
        F: { total: 0, female: 0 }
      },
      categories: {
        good: { label: 'និទ្ទេសល្អ', total: 0, female: 0 },         // A + B
        fair: { label: 'និទ្ទេសល្អបង្គួរ', total: 0, female: 0 },    // C + D
        medium: { label: 'និទ្ទេសមធ្យម', total: 0, female: 0 },     // E
        weak: { label: 'និទ្ទេសខ្សោយ', total: 0, female: 0 },       // F
        noRank: { label: 'គ្មានចំ.ថ្នាក់', total: 0, female: 0 }
      },
      totalStudents: records.length,
      femaleStudents: records.filter(r => r.gender === 'ស' || r.gender === 'ស្រី').length,
      maleStudents: records.filter(r => r.gender === 'ប' || r.gender === 'ប្រុស').length
    };

    records.forEach(r => {
      const isFemale = (r.gender === 'ស' || r.gender === 'ស្រី');
      const g = r.grade;

      if (stats.grades[g]) {
        stats.grades[g].total++;
        if (isFemale) stats.grades[g].female++;
      }

      if (g === 'A' || g === 'B') {
        stats.categories.good.total++;
        if (isFemale) stats.categories.good.female++;
      } else if (g === 'C' || g === 'D') {
        stats.categories.fair.total++;
        if (isFemale) stats.categories.fair.female++;
      } else if (g === 'E') {
        stats.categories.medium.total++;
        if (isFemale) stats.categories.medium.female++;
      } else if (g === 'F') {
        stats.categories.weak.total++;
        if (isFemale) stats.categories.weak.female++;
      } else {
        stats.categories.noRank.total++;
        if (isFemale) stats.categories.noRank.female++;
      }
    });

    return stats;
  },

  // Calculate Semester 1, 2 and Annual Summary
  computeAllYearSummaries(state) {
    const isG12 = this.isGrade12(state);
    const sem1Months = ['month_11', 'month_12', 'month_01', 'month_02']; // Note: March moved to Semester 2
    // Grade 12 rule: Semester 2 only ever tests March (month_03) and May (month_05)
    const sem2Months = isG12
      ? ['month_03', 'month_05']
      : ['month_03', 'month_04', 'month_05', 'month_06', 'month_07', 'month_08', 'month_09'];

    // Pre-calculate month averages
    const monthAverages = {};
    (state.months || []).forEach(m => {
      const pData = this.computePeriodData(m.id, state);
      monthAverages[m.id] = {};
      pData.forEach(item => {
        monthAverages[m.id][item.id] = item.avg;
      });
    });

    const hasSem1Exam = this.hasPeriodEnteredScores('sem_1', state);
    const hasSem2Exam = this.hasPeriodEnteredScores('sem_2', state);

    // Identify tested months in each semester (only months that actually have entered scores are counted in divisor)
    const testedSem1Months = sem1Months.filter(mid => this.hasPeriodEnteredScores(mid, state));
    const sem1MonthDivisor = testedSem1Months.length > 0 ? testedSem1Months.length : 1;

    const testedSem2Months = sem2Months.filter(mid => this.hasPeriodEnteredScores(mid, state));
    const sem2MonthDivisor = testedSem2Months.length > 0 ? testedSem2Months.length : 1;

    const summaries = (state.students || []).map(st => {
      const sid = st.id;

      // Semester 1 Monthly Avg: sum of tested months divided by count of tested months
      let s1MonthSum = 0;
      testedSem1Months.forEach(mid => {
        const a = monthAverages[mid]?.[sid];
        if (typeof a === 'number' && !isNaN(a)) {
          s1MonthSum += a;
        }
      });
      const rawS1MonthlyAvg = sem1MonthDivisor > 0 ? (s1MonthSum / sem1MonthDivisor) : 0;
      const isG12 = this.isGrade12(state);
      const rules = state.gradingRules || state.schoolConfig?.gradingRules;

      // Grade 12 rule: round ONLY the Monthly Average column (ម.ខែ) to integer (e.g. 48.00, 32.00)
      const s1MonthlyAvg = rawS1MonthlyAvg > 0
        ? (isG12 && (rules?.roundGrade12Semester !== false) ? Math.round(rawS1MonthlyAvg) : parseFloat(rawS1MonthlyAvg.toFixed(2)))
        : 0;

      const s1ExamAvg = (hasSem1Exam && monthAverages['sem_1']?.[sid] !== undefined)
        ? parseFloat(Number(monthAverages['sem_1'][sid]).toFixed(2))
        : 0;

      let sem1Avg = 0;
      let rawSem1Avg = 0;
      if (hasSem1Exam && s1ExamAvg > 0 && s1MonthlyAvg > 0) {
        sem1Avg = parseFloat(((s1MonthlyAvg + s1ExamAvg) / 2).toFixed(2));
        rawSem1Avg = parseFloat(((rawS1MonthlyAvg + s1ExamAvg) / 2).toFixed(2));
      } else if (hasSem1Exam && s1ExamAvg > 0) {
        sem1Avg = s1ExamAvg;
        rawSem1Avg = s1ExamAvg;
      }

      // Semester 2 Monthly Avg: sum of tested months divided by count of tested months (e.g. March & May = / 2)
      let s2MonthSum = 0;
      testedSem2Months.forEach(mid => {
        const a = monthAverages[mid]?.[sid];
        if (typeof a === 'number' && !isNaN(a)) {
          s2MonthSum += a;
        }
      });
      const rawS2MonthlyAvg = sem2MonthDivisor > 0 ? (s2MonthSum / sem2MonthDivisor) : 0;
      const s2MonthlyAvg = rawS2MonthlyAvg > 0
        ? (isG12 && (rules?.roundGrade12Semester !== false) ? Math.round(rawS2MonthlyAvg) : parseFloat(rawS2MonthlyAvg.toFixed(2)))
        : 0;

      const s2ExamAvg = (hasSem2Exam && monthAverages['sem_2']?.[sid] !== undefined)
        ? parseFloat(Number(monthAverages['sem_2'][sid]).toFixed(2))
        : 0;

      let sem2Avg = 0;
      let rawSem2Avg = 0;
      if (hasSem2Exam && s2ExamAvg > 0 && s2MonthlyAvg > 0) {
        sem2Avg = parseFloat(((s2MonthlyAvg + s2ExamAvg) / 2).toFixed(2));
        rawSem2Avg = parseFloat(((rawS2MonthlyAvg + s2ExamAvg) / 2).toFixed(2));
      } else if (hasSem2Exam && s2ExamAvg > 0) {
        sem2Avg = s2ExamAvg;
        rawSem2Avg = s2ExamAvg;
      }

      // Annual Average = (Sem 1 + Sem 2) / 2
      let yearAvg = 0;
      let rawYearAvg = 0;
      if (sem1Avg > 0 && sem2Avg > 0) {
        yearAvg = parseFloat(((sem1Avg + sem2Avg) / 2).toFixed(2));
        rawYearAvg = parseFloat((((rawSem1Avg || sem1Avg) + (rawSem2Avg || sem2Avg)) / 2).toFixed(2));
      }

      const { grade, mention, pass, colorClass } = this.getGradeAndMention(yearAvg);
      const remark = yearAvg > 0 ? this.getTeacherRemark(yearAvg, state, rules) : 'មិនទាន់មានលទ្ធផល';

      return {
        id: sid,
        name: st.name,
        gender: st.gender,
        dob: st.dob,
        phone: st.phone,
        sem1MonthlyAvg: s1MonthlyAvg > 0 ? s1MonthlyAvg : '-',
        rawS1MonthlyAvg: rawS1MonthlyAvg > 0 ? parseFloat(rawS1MonthlyAvg.toFixed(2)) : 0,
        sem1ExamAvg: hasSem1Exam ? (s1ExamAvg > 0 ? s1ExamAvg : '-') : '-',
        sem1Avg: sem1Avg > 0 ? sem1Avg : '-',
        rawSem1Avg: rawSem1Avg > 0 ? rawSem1Avg : sem1Avg,
        sem1TestedMonthsCount: sem1MonthDivisor,
        sem2MonthlyAvg: s2MonthlyAvg > 0 ? s2MonthlyAvg : '-',
        rawS2MonthlyAvg: rawS2MonthlyAvg > 0 ? parseFloat(rawS2MonthlyAvg.toFixed(2)) : 0,
        sem2ExamAvg: hasSem2Exam ? (s2ExamAvg > 0 ? s2ExamAvg : '-') : '-',
        sem2Avg: sem2Avg > 0 ? sem2Avg : '-',
        rawSem2Avg: rawSem2Avg > 0 ? rawSem2Avg : sem2Avg,
        sem2TestedMonthsCount: sem2MonthDivisor,
        yearAvg: yearAvg > 0 ? yearAvg : '-',
        rawYearAvg: rawYearAvg > 0 ? rawYearAvg : yearAvg,
        yearRank: '-',
        grade: yearAvg > 0 ? grade : '-',
        mention: yearAvg > 0 ? mention : '-',
        pass,
        colorClass,
        remark
      };
    });

    if (summaries.some(s => typeof s.yearAvg === 'number' && s.yearAvg > 0)) {
      const rankMap = this.calculateRanks(summaries, 'rawYearAvg');
      summaries.forEach(s => {
        s.yearRank = rankMap.get(s.id) || '-';
      });
    }

    return summaries;
  },

  // Calculate Students for Re-Exam (ប្រឡងឡើងថ្នាក់) and Repeat (រៀនត្រួតថ្នាក់)
  computeRetestRepeatData(state) {
    const summaries = this.computeAllYearSummaries(state);
    const students = state.students || [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    const att = state.attendance || {};
    const subjects = state.subjects || [];

    const s1PeriodScores = state.scoresByPeriod?.['sem_1'] || {};
    const s2PeriodScores = state.scoresByPeriod?.['sem_2'] || {};

    const list = summaries.map(s => {
      const st = studentMap.get(s.id) || {};
      let pAbs = 0, npAbs = 0;
      Object.keys(att).forEach(m => {
        const a = att[m]?.[s.id];
        if (a) {
          pAbs += (parseInt(a.permission, 10) || 0);
          npAbs += (parseInt(a.noPermission, 10) || 0);
        }
      });
      const totalAbs = pAbs + npAbs;

      const yearAvg = typeof s.yearAvg === 'number' ? s.yearAvg : parseFloat(s.yearAvg);
      const hasYearAvg = typeof yearAvg === 'number' && !isNaN(yearAvg) && yearAvg > 0;
      const isFail = hasYearAvg && yearAvg < 25.00;

      // Identify weak subjects (< 5.0 out of 10)
      const weakSubjects = [];
      if (isFail) {
        subjects.forEach(sub => {
          const sc1 = s1PeriodScores[s.id]?.[sub.id];
          const sc2 = s2PeriodScores[s.id]?.[sub.id];
          let subYr = 0;
          if (typeof sc1 === 'number' && typeof sc2 === 'number') {
            subYr = (sc1 + sc2) / 2;
          } else if (typeof sc1 === 'number') {
            subYr = sc1;
          } else if (typeof sc2 === 'number') {
            subYr = sc2;
          }
          const threshold = (sub.max || 10) / 2;
          if (subYr > 0 && subYr < threshold) {
            weakSubjects.push(`${sub.name} (${subYr.toFixed(1)})`);
          }
        });
      }

      let status = 'ឡើងថ្នាក់';
      let statusCode = 'pass';
      let statusClass = 'status-pass';
      let decisionReason = 'ជាប់មធ្យមភាគប្រចាំឆ្នាំ (≥ ២៥.០០)';

      if (!hasYearAvg) {
        status = 'មិនទាន់មានលទ្ធផល';
        statusCode = 'no_score';
        statusClass = 'status-no-score';
        decisionReason = 'មិនទាន់មានទិន្នន័យពិន្ទុពេញលេញ';
      } else if (isFail) {
        if (totalAbs >= 30) {
          status = 'ត្រូវរៀនត្រួតថ្នាក់';
          statusCode = 'repeat';
          statusClass = 'status-repeat';
          decisionReason = `ធ្លាក់មធ្យមភាគ (<២៥) & អវត្តមាន ≥ ៣០ ដង (សរុប ${totalAbs} ដង)`;
        } else {
          status = 'ត្រូវប្រឡងឡើងថ្នាក់';
          statusCode = 'retest';
          statusClass = 'status-retest';
          decisionReason = `ធ្លាក់មធ្យមភាគ (<២៥) & អវត្តមាន < ៣០ ដង (សរុប ${totalAbs} ដង)`;
        }
      }

      const isFemale = (st.gender === 'ស្រី' || st.gender === 'ស' || st.gender === 'F');

      return {
        id: s.id,
        name: st.name || s.name || '',
        gender: isFemale ? 'ស' : 'ប',
        isFemale,
        dob: st.dob || '-',
        pob: st.pob || st.pobProvince || '-',
        sem1Avg: typeof s.sem1Avg === 'number' ? s.sem1Avg : '-',
        sem2Avg: typeof s.sem2Avg === 'number' ? s.sem2Avg : '-',
        yearAvg: hasYearAvg ? yearAvg : '-',
        yearRank: s.yearRank || '-',
        grade: s.grade || '-',
        mention: s.mention || '-',
        pAbs,
        npAbs,
        totalAbs,
        status,
        statusCode,
        statusClass,
        decisionReason,
        weakSubjects,
        weakSubjectsText: weakSubjects.length > 0 ? weakSubjects.join(', ') : '-',
        isFail
      };
    });

    const totalStudents = list.length;
    const femaleCount = list.filter(s => s.isFemale).length;
    const passCount = list.filter(s => s.statusCode === 'pass').length;
    const passFemale = list.filter(s => s.statusCode === 'pass' && s.isFemale).length;
    const retestCount = list.filter(s => s.statusCode === 'retest').length;
    const retestFemale = list.filter(s => s.statusCode === 'retest' && s.isFemale).length;
    const repeatCount = list.filter(s => s.statusCode === 'repeat').length;
    const repeatFemale = list.filter(s => s.statusCode === 'repeat' && s.isFemale).length;
    const noScoreCount = list.filter(s => s.statusCode === 'no_score').length;

    return {
      records: list,
      stats: {
        totalStudents,
        femaleCount,
        passCount,
        passFemale,
        retestCount,
        retestFemale,
        repeatCount,
        repeatFemale,
        noScoreCount
      }
    };
  },

  /**
   * Helper to format solar date with Khmer day of week and Khmer numbers
   * @param {Date|string} date Date object or ISO string 'YYYY-MM-DD'
   * @param {string} province Optional province prefix
   */
  formatKhmerSolarDateDetailed(date, province = '') {
    if (!date) date = new Date();
    else if (typeof date === 'string') {
      const [y, m, d] = date.split('-').map(Number);
      date = new Date(y, m - 1, d);
    }
    const khmerMonths = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
    const kmDays = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const dayOfWeek = date.getDay();
    const dayStr = this.toKhmerDigits(String(date.getDate()).padStart(2, '0'));
    const monthStr = khmerMonths[date.getMonth()];
    const yearStr = this.toKhmerDigits(date.getFullYear());
    const provPrefix = province ? `${province}, ` : '';
    return `${provPrefix}ថ្ងៃ${kmDays[dayOfWeek]} ថ្ងៃទី${dayStr} ខែ${monthStr} ឆ្នាំ${yearStr}`;
  }
};

if (typeof window !== 'undefined') window.Calculations = Calculations;
if (typeof module !== 'undefined') module.exports = { Calculations };
