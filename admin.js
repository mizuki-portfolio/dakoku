"use strict";

// 定数
const NORMAL_WORK_HOURS = 8; // 1日の通常労働時間（時間）
const DEFAULT_PASSWORD = "0000"; // デフォルトパスワード

// DOM要素
const passwordOverlay = document.querySelector('#passwordOverlay');
const passwordInput = document.querySelector('#passwordInput');
const passwordSubmit = document.querySelector('#passwordSubmit');
const passwordBack = document.querySelector('#passwordBack');
const passwordError = document.querySelector('#passwordError');
const mainHeader = document.querySelector('#mainHeader');
const mainContent = document.querySelector('#mainContent');

// 時間管理画面の要素（存在チェック用）
const monthSelect = document.querySelector('#monthSelect');
const employeeList = document.querySelector('#employeeList');
const detailTableBody = document.querySelector('#detailTableBody');
const employeeFilter = document.querySelector('#employeeFilter');
const dateFilter = document.querySelector('#dateFilter');
const totalWorkHoursEl = document.querySelector('#totalWorkHours');
const totalOvertimeHoursEl = document.querySelector('#totalOvertimeHours');
const avgWorkHoursEl = document.querySelector('#avgWorkHours');
const monthlyReportText = document.querySelector('#monthlyReportText');
const reportGenerateBtn = document.querySelector('#reportGenerateBtn');
const reportCopyBtn = document.querySelector('#reportCopyBtn');
const reportDownloadCsvBtn = document.querySelector('#reportDownloadCsvBtn');
const reportMessage = document.querySelector('#reportMessage');

// 設定画面の要素（存在チェック用）
const currentPasswordInput = document.querySelector('#currentPassword');
const newPasswordInput = document.querySelector('#newPassword');
const confirmPasswordInput = document.querySelector('#confirmPassword');
const changePasswordBtn = document.querySelector('#changePasswordBtn');
const passwordChangeError = document.querySelector('#passwordChangeError');
const newEmployeeNameInput = document.querySelector('#newEmployeeName');
const addEmployeeBtn = document.querySelector('#addEmployeeBtn');
const addEmployeeError = document.querySelector('#addEmployeeError');
const removeEmployeeSelect = document.querySelector('#removeEmployeeSelect');
const removeEmployeeBtn = document.querySelector('#removeEmployeeBtn');
const removeEmployeeError = document.querySelector('#removeEmployeeError');
const resetDataBtn = document.querySelector('#resetDataBtn');
const resetDataError = document.querySelector('#resetDataError');

// 画面判定
const isTimeManagementPage = monthSelect !== null;
const isSettingsPage = currentPasswordInput !== null;

// 現在の月を設定（時間管理画面のみ）
if (isTimeManagementPage) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthSelect.value = currentMonth;
  dateFilter.value = now.toISOString().slice(0, 10);
}

// データ取得
let timers = JSON.parse(localStorage.getItem('timers')) || [];
const setTimers = () => {
  localStorage.setItem('timers', JSON.stringify(timers));
};

// 社員リスト管理
const EMPLOYEE_LIST_KEY = 'employeeList';
const DEMO_TIMERS_SEEDED_KEY = 'demoTimersSeeded';

const DEFAULT_EMPLOYEES = [
  '山田 太郎（営業）',
  '佐藤 花子（総務）',
  '鈴木 一郎（開発）',
  '高橋 美咲（開発）',
  '田中 健（人事）',
  '伊藤 彩（経理）',
  '渡辺 直樹（営業）',
  '山本 未来（サポート）',
  '中村 陽菜（企画）',
  '小林 大輔（開発）',
  '加藤 玲奈（デザイン）',
  '吉田 恒一（営業）',
  '山口 さくら（広報）',
  '松本 亮（開発）',
  '井上 愛（総務）',
  '木村 翔（開発）',
  '林 優（経理）',
  '清水 由紀（人事）',
  '斎藤 海斗（開発）',
  '阿部 まどか（企画）',
  '橋本 慶（営業）',
  '池田 亜美（サポート）',
  '石井 健太（開発）',
  '森川 奈々（デザイン）'
];

const getEmployeeList = () => {
  const stored = localStorage.getItem(EMPLOYEE_LIST_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (_) {
      // 破損している場合はデフォルトを再投入
    }
  }

  // デフォルトの社員リスト（初回 or 空/破損時）
  setEmployeeList(DEFAULT_EMPLOYEES);
  return DEFAULT_EMPLOYEES;
};

const setEmployeeList = (employees) => {
  localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(employees));
  // index.htmlの社員リストも更新するため、イベントを発火
  window.dispatchEvent(new CustomEvent('employeeListUpdated', { detail: employees }));
};

// 画面表示用の社員名リスト（設定の社員リストを優先）
const getEmployeeNames = () => {
  return getActiveEmployeeList();
};

// デモ用の打刻履歴を数日分生成（既存が空のときだけ）
const seedDemoTimersIfEmpty = () => {
  if (timers.length > 0) return;
  if (localStorage.getItem(DEMO_TIMERS_SEEDED_KEY) === '1') return;

  const employees = getEmployeeList().slice(0, 8);
  const dates = [];
  const d = new Date();

  // 直近10営業日（当日含む、土日除外）
  while (dates.length < 10) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() - 1);
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const toTimeStr = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${pad2(h)} : ${pad2(m)}`;
  };

  const demoTimers = [];

  dates.forEach((dateStr, dayIdx) => {
    employees.forEach((name, empIdx) => {
      // 09:00±10分
      const inOffset = ((empIdx * 3 + dayIdx * 5) % 21) - 10;
      const inMin = 9 * 60 + inOffset;

      // 18:00〜19:30 くらい（たまに残業）
      const baseOut = 18 * 60;
      const outOffset = (empIdx * 7 + dayIdx * 11) % 91; // 0..90
      const outMin = Math.max(inMin + 8 * 60 + 10, baseOut + outOffset);

      demoTimers.push(
        { name, text: '出勤', time: toTimeStr(inMin), date: dateStr },
        { name, text: '退勤', time: toTimeStr(outMin), date: dateStr }
      );
    });
  });

  // 新しい順に見せたいので、日付降順・退勤→出勤の順で並べる
  demoTimers.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    // 退勤を先に
    if (a.text !== b.text) return a.text === '退勤' ? -1 : 1;
    return a.time < b.time ? 1 : -1;
  });

  timers = demoTimers;
  localStorage.setItem('timers', JSON.stringify(timers));
  localStorage.setItem(DEMO_TIMERS_SEEDED_KEY, '1');
};

seedDemoTimersIfEmpty();

// 社員名リストを取得（打刻データから）
const getEmployeeNamesFromTimers = () => {
  const names = new Set();
  timers.forEach(timer => names.add(timer.name));
  return Array.from(names).sort();
};

// アクティブな社員リストを取得（設定で管理されているリスト）
const getActiveEmployeeList = () => {
  return getEmployeeList();
};

// 時間文字列を分に変換（例: "09:00" -> 540分）
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// 分を時間文字列に変換（例: 540分 -> "9:00"）
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
};

// 労働時間を計算（出勤と退勤のペアから）
const calculateWorkTime = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const inMinutes = timeToMinutes(checkIn.time.replace(' : ', ':'));
  const outMinutes = timeToMinutes(checkOut.time.replace(' : ', ':'));
  return outMinutes - inMinutes;
};

// 日付文字列を比較用に正規化
const normalizeDate = (dateStr) => {
  return dateStr;
};

// 月のデータを取得
const getMonthData = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return timers.filter(timer => {
    const timerDate = new Date(timer.date);
    return timerDate.getFullYear() === year && timerDate.getMonth() + 1 === month;
  });
};

// 社員別の日次データを集計
const getEmployeeDailyData = (employeeName, yearMonth) => {
  const monthData = getMonthData(yearMonth);
  const employeeData = monthData.filter(t => t.name === employeeName);

  // 日付ごとにグループ化
  const dailyData = {};
  employeeData.forEach(timer => {
    if (!dailyData[timer.date]) {
      dailyData[timer.date] = { checkIn: null, checkOut: null };
    }
    if (timer.text === '出勤') {
      dailyData[timer.date].checkIn = timer;
    } else if (timer.text === '退勤') {
      dailyData[timer.date].checkOut = timer;
    }
  });

  // 各日の労働時間と残業時間を計算
  const results = [];
  Object.keys(dailyData).sort().forEach(date => {
    const day = dailyData[date];
    if (day.checkIn && day.checkOut) {
      const workMinutes = calculateWorkTime(day.checkIn, day.checkOut);
      const workHours = workMinutes / 60;
      const normalMinutes = NORMAL_WORK_HOURS * 60;
      const overtimeMinutes = Math.max(0, workMinutes - normalMinutes);

      results.push({
        date,
        checkIn: day.checkIn,
        checkOut: day.checkOut,
        workMinutes,
        workHours,
        overtimeMinutes,
        overtimeHours: overtimeMinutes / 60
      });
    }
  });

  return results;
};

// 社員別の月間集計
const getEmployeeMonthlySummary = (employeeName, yearMonth) => {
  const dailyData = getEmployeeDailyData(employeeName, yearMonth);
  const totalWorkMinutes = dailyData.reduce((sum, day) => sum + day.workMinutes, 0);
  const totalOvertimeMinutes = dailyData.reduce((sum, day) => sum + day.overtimeMinutes, 0);
  const workDays = dailyData.length;

  return {
    name: employeeName,
    totalWorkHours: totalWorkMinutes / 60,
    totalOvertimeHours: totalOvertimeMinutes / 60,
    workDays,
    avgWorkHours: workDays > 0 ? totalWorkMinutes / 60 / workDays : 0,
    dailyData
  };
};

const pad2 = (n) => String(n).padStart(2, '0');
const minutesToHHMM = (minutes) => {
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
};

const buildMonthlyReportRows = (yearMonth) => {
  const employees = getEmployeeNames();
  const rows = [];

  employees.forEach((name) => {
    const summary = getEmployeeMonthlySummary(name, yearMonth);
    summary.dailyData.forEach((day) => {
      rows.push({
        month: yearMonth,
        name,
        date: day.date,
        checkIn: day.checkIn?.time || '',
        checkOut: day.checkOut?.time || '',
        work: minutesToHHMM(day.workMinutes),
        overtime: minutesToHHMM(day.overtimeMinutes)
      });
    });
  });

  // Excelで見やすいように、社員名→日付の順で並べる
  rows.sort((a, b) => {
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return 0;
  });

  return rows;
};

const buildMonthlyReportTsv = (yearMonth) => {
  const rows = buildMonthlyReportRows(yearMonth);
  const lines = [];

  // そのままExcelに貼れる「表」だけにする
  lines.push(['月', '社員名', '日付', '出勤', '退勤', '労働(HH:MM)', '残業(HH:MM)'].join('\t'));
  rows.forEach((r) => {
    lines.push([r.month, r.name, r.date, r.checkIn, r.checkOut, r.work, r.overtime].join('\t'));
  });

  return lines.join('\n');
};

const buildMonthlyReportCsv = (yearMonth) => {
  const rows = buildMonthlyReportRows(yearMonth);

  const escapeCsv = (value) => {
    const s = String(value ?? '');
    // Excel向け: 必ずダブルクォートで囲う（改行/カンマ対策）
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = ['月', '社員名', '日付', '出勤', '退勤', '労働(HH:MM)', '残業(HH:MM)'];
  const lines = [header.map(escapeCsv).join(',')];
  rows.forEach((r) => {
    lines.push([r.month, r.name, r.date, r.checkIn, r.checkOut, r.work, r.overtime].map(escapeCsv).join(','));
  });

  // Windows Excelでの貼り付け/改行を安定させる
  return lines.join('\r\n');
};

const setReportMessage = (text, color = '#28a745') => {
  if (!reportMessage) return;
  reportMessage.style.color = color;
  reportMessage.textContent = text;
  if (text) {
    setTimeout(() => {
      reportMessage.textContent = '';
    }, 2500);
  }
};

const renderMonthlyReport = () => {
  if (!isTimeManagementPage || !monthlyReportText) return;
  const yearMonth = monthSelect.value;
  monthlyReportText.value = buildMonthlyReportTsv(yearMonth);
};

// 全体の月間サマリーを計算
const calculateMonthlySummary = (yearMonth) => {
  const employees = getEmployeeNamesFromTimers();
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalWorkDays = 0;

  employees.forEach(name => {
    const summary = getEmployeeMonthlySummary(name, yearMonth);
    totalWorkHours += summary.totalWorkHours;
    totalOvertimeHours += summary.totalOvertimeHours;
    totalWorkDays += summary.workDays;
  });

  const avgWorkHours = employees.length > 0 ? totalWorkHours / employees.length : 0;

  return {
    totalWorkHours,
    totalOvertimeHours,
    avgWorkHours,
    totalWorkDays
  };
};

// サマリーを表示
const renderSummary = (yearMonth) => {
  const summary = calculateMonthlySummary(yearMonth);
  totalWorkHoursEl.textContent = `${summary.totalWorkHours.toFixed(1)}時間`;
  totalOvertimeHoursEl.textContent = `${summary.totalOvertimeHours.toFixed(1)}時間`;
  avgWorkHoursEl.textContent = `${summary.avgWorkHours.toFixed(1)}時間`;
};

// 部署を抽出（例: "山田 太郎（営業）" -> "営業"）
const extractDepartment = (employeeName) => {
  const match = employeeName.match(/（(.+?)）/);
  return match ? match[1] : 'その他';
};

// 部署一覧を取得
const getDepartments = (employees) => {
  const departments = new Set();
  employees.forEach(emp => {
    const dept = extractDepartment(emp);
    departments.add(dept);
  });
  return Array.from(departments).sort();
};

// 選択中の部署と社員名
let selectedDepartment = null;
let selectedEmployeeName = null;

// 社員名リストを表示（部署別アコーディオン形式）
const renderEmployeeNameList = (yearMonth) => {
  const employees = getEmployeeNames();
  const departments = getDepartments(employees);
  const employeeNameList = document.querySelector('#employeeNameList');
  if (!employeeNameList) return;
  
  employeeNameList.innerHTML = '';

  departments.forEach(dept => {
    const deptEmployees = employees.filter(emp => extractDepartment(emp) === dept);
    const isDeptOpen = selectedDepartment === dept;
    
    // 部署アコーディオンアイテム
    const deptAccordionItem = document.createElement('div');
    deptAccordionItem.className = 'department-accordion-item';
    
    // 部署ヘッダー
    const deptHeader = document.createElement('button');
    deptHeader.className = 'department-accordion-header' + (isDeptOpen ? ' active' : '');
    deptHeader.textContent = dept;
    deptHeader.addEventListener('click', () => {
      if (selectedDepartment === dept) {
        selectedDepartment = null;
        selectedEmployeeName = null;
      } else {
        selectedDepartment = dept;
        selectedEmployeeName = null;
      }
      renderEmployeeNameList(yearMonth);
    });
    
    // 部署の社員リスト
    const deptContent = document.createElement('div');
    deptContent.className = 'department-accordion-content' + (isDeptOpen ? ' active' : '');
    
    const employeeList = document.createElement('div');
    employeeList.className = 'employee-list-in-dept';
    
    deptEmployees.forEach(name => {
      const summary = getEmployeeMonthlySummary(name, yearMonth);
      const isEmployeeOpen = selectedEmployeeName === name;
      
      const employeeItem = document.createElement('div');
      employeeItem.className = 'employee-accordion-item';
      
      const nameButton = document.createElement('button');
      nameButton.className = 'employee-accordion-header' + (isEmployeeOpen ? ' active' : '');
      nameButton.textContent = name;
      nameButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedEmployeeName === name) {
          selectedEmployeeName = null;
        } else {
          selectedEmployeeName = name;
        }
        renderEmployeeNameList(yearMonth);
      });
      
      const detailContent = document.createElement('div');
      detailContent.className = 'employee-accordion-content' + (isEmployeeOpen ? ' active' : '');
      detailContent.innerHTML = `
        <div class="employee-stats">
          <div class="stat-item">
            <span class="stat-label">労働日数</span>
            <span class="stat-value">${summary.workDays}日</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">総労働時間</span>
            <span class="stat-value">${summary.totalWorkHours.toFixed(1)}時間</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">残業時間</span>
            <span class="stat-value overtime">${summary.totalOvertimeHours.toFixed(1)}時間</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均労働時間/日</span>
            <span class="stat-value">${summary.avgWorkHours.toFixed(1)}時間</span>
          </div>
        </div>
      `;
      
      employeeItem.appendChild(nameButton);
      employeeItem.appendChild(detailContent);
      employeeList.appendChild(employeeItem);
    });
    
    deptContent.appendChild(employeeList);
    deptAccordionItem.appendChild(deptHeader);
    deptAccordionItem.appendChild(deptContent);
    employeeNameList.appendChild(deptAccordionItem);
  });
};

// 選択された社員の詳細を表示（後方互換性のため残す）
const renderEmployeeDetail = (yearMonth) => {
  // アコーディオン形式では使用しない
};

// 社員リストを表示（後方互換性のため残す）
const renderEmployeeList = (yearMonth) => {
  renderEmployeeNameList(yearMonth);
  renderEmployeeDetail(yearMonth);
};

// 詳細テーブルを表示
const renderDetailTable = (yearMonth, employeeName = 'all', date = '') => {
  const monthData = getMonthData(yearMonth);
  let filteredData = monthData;

  // 社員でフィルタ
  if (employeeName !== 'all') {
    filteredData = filteredData.filter(t => t.name === employeeName);
  }

  // 日付でフィルタ
  if (date) {
    filteredData = filteredData.filter(t => t.date === date);
  }

  // 日付と社員名でグループ化
  const grouped = {};
  filteredData.forEach(timer => {
    const key = `${timer.date}_${timer.name}`;
    if (!grouped[key]) {
      grouped[key] = { date: timer.date, name: timer.name, checkIn: null, checkOut: null };
    }
    if (timer.text === '出勤') {
      grouped[key].checkIn = timer;
    } else if (timer.text === '退勤') {
      grouped[key].checkOut = timer;
    }
  });

  // テーブルに表示
  detailTableBody.innerHTML = '';
  Object.keys(grouped).sort().forEach(key => {
    const day = grouped[key];
    if (day.checkIn && day.checkOut) {
      const workMinutes = calculateWorkTime(day.checkIn, day.checkOut);
      const workHours = workMinutes / 60;
      const normalMinutes = NORMAL_WORK_HOURS * 60;
      const overtimeMinutes = Math.max(0, workMinutes - normalMinutes);
      const overtimeHours = overtimeMinutes / 60;

      const inValue = day.checkIn.time.replace(' : ', ':');
      const outValue = day.checkOut.time.replace(' : ', ':');
      const inOld = day.checkIn.time;
      const outOld = day.checkOut.time;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${day.date}</td>
        <td>${day.name}</td>
        <td><input class="detail-time-input" type="time" value="${inValue}" /></td>
        <td><input class="detail-time-input" type="time" value="${outValue}" /></td>
        <td>${workHours.toFixed(1)}時間</td>
        <td class="${overtimeHours > 0 ? 'overtime' : ''}">${overtimeHours.toFixed(1)}時間</td>
        <td><button class="detail-save-btn" type="button" data-date="${day.date}" data-name="${day.name}" data-in-old="${inOld}" data-out-old="${outOld}">保存</button></td>
      `;
      detailTableBody.appendChild(row);
    }
  });
};

// 詳細テーブルで出勤/退勤時刻を編集
if (isTimeManagementPage && detailTableBody) {
  const toStoredTime = (timeHHMM) => {
    // "09:05" -> "09 : 05"
    const [h, m] = String(timeHHMM).split(':');
    if (!h || !m) return '';
    return `${h.padStart(2, '0')} : ${m.padStart(2, '0')}`;
  };

  const findTimerIndex = (date, name, text, oldTime) => {
    // まずは「元の時刻」まで一致するものを優先
    const exact = timers.findIndex(t => t.date === date && t.name === name && t.text === text && t.time === oldTime);
    if (exact !== -1) return exact;
    // 次に date/name/text だけで（重複がある場合は先頭を更新）
    return timers.findIndex(t => t.date === date && t.name === name && t.text === text);
  };

  detailTableBody.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('detail-save-btn')) return;

    const btn = target;
    const row = btn.closest('tr');
    if (!row) return;

    const date = btn.dataset.date || '';
    const name = btn.dataset.name || '';
    const inOld = btn.dataset.inOld || '';
    const outOld = btn.dataset.outOld || '';

    const inputs = row.querySelectorAll('input.detail-time-input');
    const inInput = inputs[0];
    const outInput = inputs[1];
    if (!inInput || !outInput) return;

    const inNew = toStoredTime(inInput.value);
    const outNew = toStoredTime(outInput.value);
    if (!date || !name || !inNew || !outNew) return;

    const inIdx = findTimerIndex(date, name, '出勤', inOld);
    const outIdx = findTimerIndex(date, name, '退勤', outOld);

    if (inIdx === -1 || outIdx === -1) {
      alert('更新対象のデータが見つかりませんでした（データの形式が想定と違う可能性があります）');
      return;
    }

    timers[inIdx] = { ...timers[inIdx], time: inNew };
    timers[outIdx] = { ...timers[outIdx], time: outNew };
    setTimers();

    // 再計算＆再描画
    const yearMonth = monthSelect.value;
    renderSummary(yearMonth);
    renderEmployeeList(yearMonth);
    renderDetailTable(yearMonth, employeeFilter.value, dateFilter.value);
  });
}

// 社員フィルターのオプションを更新
const updateEmployeeFilter = () => {
  const employees = getEmployeeNamesFromTimers();
  employeeFilter.innerHTML = '<option value="all">全員</option>';
  employees.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    employeeFilter.appendChild(option);
  });
};

// パスワード管理
const getStoredPassword = () => {
  const stored = localStorage.getItem('adminPassword');
  return stored || DEFAULT_PASSWORD;
};

const setStoredPassword = (password) => {
  localStorage.setItem('adminPassword', password);
};

// パスワード認証
const checkPassword = (inputPassword) => {
  const correctPassword = getStoredPassword();
  return inputPassword === correctPassword;
};

// パスワード認証イベント
passwordSubmit.addEventListener('click', () => {
  const inputPassword = passwordInput.value;
  if (checkPassword(inputPassword)) {
    showMainContent();
  } else {
    passwordError.textContent = 'パスワードが正しくありません';
    passwordInput.value = '';
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordSubmit.click();
  }
});

// パスワード画面から前の画面へ戻る
if (passwordBack) {
  passwordBack.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });
}

// パスワード変更機能（設定画面のみ）
if (isSettingsPage && changePasswordBtn) {
  changePasswordBtn.addEventListener('click', () => {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    passwordChangeError.textContent = '';

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      passwordChangeError.textContent = 'すべての項目を入力してください';
      return;
    }

    if (!checkPassword(currentPassword)) {
      passwordChangeError.textContent = '現在のパスワードが正しくありません';
      currentPasswordInput.value = '';
      currentPasswordInput.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordChangeError.textContent = '新しいパスワードが一致しません';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      newPasswordInput.focus();
      return;
    }

    if (newPassword.length < 4) {
      passwordChangeError.textContent = 'パスワードは4文字以上にしてください';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      newPasswordInput.focus();
      return;
    }

    // パスワード変更
    setStoredPassword(newPassword);
    passwordChangeError.textContent = '';
    passwordChangeError.style.color = '#28a745';
    passwordChangeError.textContent = 'パスワードを変更しました';

    // フォームをクリア
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';

    setTimeout(() => {
      passwordChangeError.textContent = '';
    }, 3000);
  });
}

// 削除用の社員リストを更新（設定画面のみ）
const updateRemoveEmployeeSelect = () => {
  if (!isSettingsPage || !removeEmployeeSelect) return;
  const employees = getActiveEmployeeList();
  removeEmployeeSelect.innerHTML = '<option value="">選択してください</option>';
  employees.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    removeEmployeeSelect.appendChild(option);
  });
};

// 社員管理機能（設定画面のみ）
if (isSettingsPage) {
  // 社員追加
  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener('click', () => {
      const newName = newEmployeeNameInput.value.trim();
      addEmployeeError.textContent = '';

      if (!newName) {
        addEmployeeError.textContent = '社員名を入力してください';
        return;
      }

      const currentEmployees = getActiveEmployeeList();
      if (currentEmployees.includes(newName)) {
        addEmployeeError.textContent = 'この社員は既に登録されています';
        newEmployeeNameInput.value = '';
        newEmployeeNameInput.focus();
        return;
      }

      // 社員を追加
      const updatedEmployees = [...currentEmployees, newName].sort();
      setEmployeeList(updatedEmployees);

      addEmployeeError.style.color = '#28a745';
      addEmployeeError.textContent = `${newName} を追加しました`;
      newEmployeeNameInput.value = '';

      // 削除用のセレクトボックスを更新
      updateRemoveEmployeeSelect();

      setTimeout(() => {
        addEmployeeError.textContent = '';
      }, 3000);
    });
  }

  // 社員削除
  if (removeEmployeeBtn) {
    removeEmployeeBtn.addEventListener('click', () => {
      const selectedName = removeEmployeeSelect.value;
      removeEmployeeError.textContent = '';

      if (!selectedName) {
        removeEmployeeError.textContent = '削除する社員を選択してください';
        return;
      }

      if (!confirm(`${selectedName} を社員リストから削除しますか？\n（打刻データは残ります）`)) {
        return;
      }

      // 社員を削除（打刻データは残す）
      const currentEmployees = getActiveEmployeeList();
      const updatedEmployees = currentEmployees.filter(name => name !== selectedName);
      setEmployeeList(updatedEmployees);

      removeEmployeeError.style.color = '#28a745';
      removeEmployeeError.textContent = `${selectedName} を削除しました`;
      removeEmployeeSelect.value = '';

      // 削除用のセレクトボックスを更新
      updateRemoveEmployeeSelect();

      setTimeout(() => {
        removeEmployeeError.textContent = '';
      }, 3000);
    });
  }

  // データリセット機能
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      if (!confirm('すべてのデータを削除して初期状態に戻しますか？\n\nこの操作は取り消せません。')) {
        return;
      }

      // すべてのLocalStorageデータを削除
      localStorage.removeItem('timers');
      localStorage.removeItem('employeeList');
      localStorage.removeItem('adminPassword');
      localStorage.removeItem('demoTimersSeeded');

      resetDataError.style.color = '#28a745';
      resetDataError.textContent = 'データをリセットしました。ページを再読み込みします...';

      // 3秒後にページを再読み込み
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    });
  }
}

// ハンバーガーメニュー
const hamburgerMenu = document.querySelector('#hamburgerMenu');
const hamburgerNav = document.querySelector('#hamburgerNav');
const menuOverlay = document.createElement('div');
menuOverlay.className = 'menu-overlay';
document.body.appendChild(menuOverlay);

if (hamburgerMenu && hamburgerNav) {
  hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('active');
    hamburgerNav.classList.toggle('active');
    menuOverlay.classList.toggle('active');
  });

  menuOverlay.addEventListener('click', () => {
    hamburgerMenu.classList.remove('active');
    hamburgerNav.classList.remove('active');
    menuOverlay.classList.remove('active');
  });
}

// 目次のスムーズスクロール機能
const initTableOfContents = () => {
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const headerHeight = document.querySelector('#mainHeader')?.offsetHeight || 0;
        const targetPosition = targetElement.offsetTop - headerHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
};

// パスワード認証成功時の処理
const showMainContent = () => {
  passwordOverlay.style.display = 'none';
  mainHeader.style.display = 'block';
  mainContent.style.display = 'block';

  // 時間管理画面の場合
  if (isTimeManagementPage) {
    updateEmployeeFilter();
    const yearMonth = monthSelect.value;
    renderSummary(yearMonth);
    renderEmployeeList(yearMonth);
    renderDetailTable(yearMonth, employeeFilter.value, dateFilter.value);
    renderMonthlyReport();
    initTableOfContents();
  }

  // 設定画面の場合
  if (isSettingsPage) {
    updateRemoveEmployeeSelect();
  }
};

// 初期化とイベントリスナー（時間管理画面のみ）
if (isTimeManagementPage) {
  const init = () => {
    // パスワード認証が成功した場合のみ実行
    if (monthSelect) {
      monthSelect.addEventListener('change', () => {
        const yearMonth = monthSelect.value;
        selectedDepartment = null; // 月が変更されたら選択をリセット
        selectedEmployeeName = null;
        renderSummary(yearMonth);
        renderEmployeeList(yearMonth);
        renderDetailTable(yearMonth, employeeFilter.value, dateFilter.value);
        renderMonthlyReport();
      });
    }

    if (employeeFilter) {
      employeeFilter.addEventListener('change', () => {
        renderDetailTable(monthSelect.value, employeeFilter.value, dateFilter.value);
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', () => {
        renderDetailTable(monthSelect.value, employeeFilter.value, dateFilter.value);
      });
    }
  };

  init();
}

// レポート生成/コピー
if (isTimeManagementPage) {
  if (reportGenerateBtn) {
    reportGenerateBtn.addEventListener('click', () => {
      renderMonthlyReport();
      setReportMessage('生成しました');
    });
  }

  if (reportCopyBtn && monthlyReportText) {
    reportCopyBtn.addEventListener('click', async () => {
      const text = monthlyReportText.value || '';
      if (!text) {
        setReportMessage('先に生成してください', '#e74c3c');
        return;
      }

      // Clipboard API が使えない（file:// 等）環境向けにフォールバック
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          setReportMessage('コピーしました');
          return;
        }
      } catch (_) {
        // フォールバックへ
      }

      monthlyReportText.focus();
      monthlyReportText.select();
      try {
        const ok = document.execCommand('copy');
        setReportMessage(ok ? 'コピーしました' : 'コピーに失敗しました', ok ? '#28a745' : '#e74c3c');
      } catch (_) {
        setReportMessage('コピーに失敗しました', '#e74c3c');
      }
    });
  }

  if (reportDownloadCsvBtn) {
    reportDownloadCsvBtn.addEventListener('click', () => {
      const yearMonth = monthSelect.value;
      const csv = buildMonthlyReportCsv(yearMonth);

      // 日本語が文字化けしにくいように UTF-8 BOM を付与
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `月次レポート_${yearMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setReportMessage('CSVをダウンロードしました');
    });
  }
}

// 設定画面の場合はパスワード認証をスキップ
if (isSettingsPage) {
  showMainContent();
}
