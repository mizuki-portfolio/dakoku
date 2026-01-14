"use strict";

// 定数
const NORMAL_WORK_HOURS = 8; // 1日の通常労働時間（時間）
const DEFAULT_PASSWORD = "0000"; // デフォルトパスワード

// DOM要素
const passwordOverlay = document.querySelector('#passwordOverlay');
const passwordInput = document.querySelector('#passwordInput');
const passwordSubmit = document.querySelector('#passwordSubmit');
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

// 社員リスト管理
const EMPLOYEE_LIST_KEY = 'employeeList';

const getEmployeeList = () => {
  const stored = localStorage.getItem(EMPLOYEE_LIST_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // デフォルトの社員リスト（初回のみ）
  const defaultEmployees = [
    '畠山 太郎', '佐藤 次郎', '田中 三子', '鈴木 四郎', '山田 花子',
    '高橋 五郎', '伊藤 六美', '渡辺 七海', '中村 八重', '小林 九男',
    '加藤 十香', '吉田 十一', '山本 十二'
  ];
  setEmployeeList(defaultEmployees);
  return defaultEmployees;
};

const setEmployeeList = (employees) => {
  localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(employees));
  // index.htmlの社員リストも更新するため、イベントを発火
  window.dispatchEvent(new CustomEvent('employeeListUpdated', { detail: employees }));
};

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

// 社員リストを表示
const renderEmployeeList = (yearMonth) => {
  const employees = getEmployeeNames();
  employeeList.innerHTML = '';

  employees.forEach(name => {
    const summary = getEmployeeMonthlySummary(name, yearMonth);
    const card = document.createElement('div');
    card.className = 'employee-card';
    card.innerHTML = `
      <div class="employee-name">${name}</div>
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
    employeeList.appendChild(card);
  });
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

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${day.date}</td>
        <td>${day.name}</td>
        <td>${day.checkIn.time}</td>
        <td>${day.checkOut.time}</td>
        <td>${workHours.toFixed(1)}時間</td>
        <td class="${overtimeHours > 0 ? 'overtime' : ''}">${overtimeHours.toFixed(1)}時間</td>
      `;
      detailTableBody.appendChild(row);
    }
  });
};

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
    renderDetailTable(yearMonth);
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
        renderSummary(yearMonth);
        renderEmployeeList(yearMonth);
        renderDetailTable(yearMonth, employeeFilter.value, dateFilter.value);
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
