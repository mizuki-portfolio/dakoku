"use strict";

const intime = document.querySelector('#intime');
const today = document.querySelector('#today');
const todaytime = document.querySelector('#todayTime');
const namesList = document.querySelector('#names');
const names = document.querySelector('.names');
const overlaynames = document.querySelector('.overlay-names');
const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const checkIn = document.querySelector('#check-in');
const checkOut = document.querySelector('#check-out');
const close = document.querySelector('#close');
const close2 = document.querySelector('#close2');
const confirmOverlay = document.querySelector('#confirmOverlay');
const confirmMessage = document.querySelector('#confirmMessage');
const confirmYes = document.querySelector('#confirmYes');
const confirmNo = document.querySelector('#confirmNo');


let timers;
let selectedName = '';
let lastAction = null; // 最後に行った操作種別（'check-in' または 'check-out'）
let pendingAction = null; // 保留中の操作（確認待ちの関数）

// 社員リスト管理
const EMPLOYEE_LIST_KEY = 'employeeList';

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
  localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(DEFAULT_EMPLOYEES));
  return DEFAULT_EMPLOYEES;
};

// 社員リストを表示
const renderEmployeeList = () => {
  const employees = getEmployeeList();
  namesList.innerHTML = '';
  
  employees.forEach(employeeName => {
    const li = document.createElement('li');
    li.textContent = employeeName;
    li.addEventListener('click', () => {
      selectedName = employeeName;
      modal.classList.add('correct');
      overlay.classList.add('correct');
      names.classList.remove('correct');
      overlaynames.classList.remove('correct');
    });
    namesList.appendChild(li);
  });
};

// 社員リスト更新イベントをリッスン
window.addEventListener('employeeListUpdated', (event) => {
  renderEmployeeList();
});

// 初期化時に社員リストを表示
renderEmployeeList();


const updateDate = () => {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const d = now.getDay();
  const day = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  today.textContent = `${month + 1}月${date} ${day[d]}`;
}

updateDate();

const updateTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  todaytime.textContent = `${hours} : ${minutes} `
}

updateTime();

setInterval(updateTime, 1000);

intime.addEventListener('click', () => {
  names.classList.add('correct');
  overlaynames.classList.add('correct');
})

timers = JSON.parse(localStorage.getItem('timers')) || [];

// デモ用の打刻履歴を数日分生成（既存が空のときだけ）
const DEMO_TIMERS_SEEDED_KEY = 'demoTimersSeeded';
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

  demoTimers.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    if (a.text !== b.text) return a.text === '退勤' ? -1 : 1;
    return a.time < b.time ? 1 : -1;
  });

  timers = demoTimers;
  setTimers();
  localStorage.setItem(DEMO_TIMERS_SEEDED_KEY, '1');
};

seedDemoTimersIfEmpty();

const setTimers = () => {
  localStorage.setItem('timers', JSON.stringify(timers));
}

// 社員リストのクリックイベントはrenderEmployeeList内で設定済み

close.addEventListener('click', () => {
  names.classList.remove('correct');
  overlaynames.classList.remove('correct');
  modal.classList.remove('correct');
  overlay.classList.remove('correct');
});

close2.addEventListener('click', () => {
  modal.classList.remove('correct');
  overlay.classList.remove('correct');
});

checkIn.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  const alreadyCheckedInToday = timers.some(t =>
    t.name === selectedName &&
    t.date === today &&
    t.text === '出勤'
  );

  // その日にすでに出勤がある場合のみ確認モーダルを表示
  if (alreadyCheckedInToday) {
    showConfirmModal('出勤', () => {
      executeCheckIn();
      lastAction = 'check-in';
    });
  } else {
    executeCheckIn();
    lastAction = 'check-in';
  }
})

const showConfirmModal = (actionType, actionCallback) => {
  confirmMessage.textContent = `本日この社員の${actionType}はすでに登録されています。追加で${actionType}しますか？`;
  pendingAction = actionCallback;
  confirmOverlay.style.display = 'flex';
  modal.classList.remove('correct');
  overlay.classList.remove('correct');
}

const hideConfirmModal = () => {
  confirmOverlay.style.display = 'none';
  pendingAction = null;
}

confirmYes.addEventListener('click', () => {
  if (pendingAction) {
    pendingAction();
  }
});

confirmNo.addEventListener('click', () => {
  hideConfirmModal();
  lastAction = null; // キャンセルしたのでリセット
});

const executeCheckIn = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const newTimer = {
    name: selectedName,
    text: '出勤',
    time: `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')}`,
    date: now.toISOString().slice(0, 10)
  }
  timers.unshift(newTimer)
  renderBySelectedDate(now.toISOString().slice(0, 10));

  modal.classList.remove('correct');
  overlay.classList.remove('correct');
  hideConfirmModal();
  setTimers();
}

checkOut.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  const alreadyCheckedOutToday = timers.some(t =>
    t.name === selectedName &&
    t.date === today &&
    t.text === '退勤'
  );

  // その日にすでに退勤がある場合のみ確認モーダルを表示
  if (alreadyCheckedOutToday) {
    showConfirmModal('退勤', () => {
      executeCheckOut();
      lastAction = 'check-out';
    });
  } else {
    executeCheckOut();
    lastAction = 'check-out';
  }
})

const executeCheckOut = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const newTimer = {
    name: selectedName,
    text: '退勤',
    time: `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')}`,
    date: now.toISOString().slice(0, 10)
  }
  timers.unshift(newTimer)
  renderBySelectedDate(now.toISOString().slice(0, 10));

  modal.classList.remove('correct');
  overlay.classList.remove('correct');
  hideConfirmModal();
  setTimers();
}

const timeList = document.querySelector('.timer ul')

const renderTimer = (timer, index = null) => {
  const li = document.createElement('li');
  const timerName = document.createElement('span');
  timerName.className = 'timer-name';
  timerName.textContent = timer.name;
  const timerTime = document.createElement('span');
  timerTime.textContent = timer.time;
  timerTime.className = 'timer-time';
  const timerIntime = document.createElement('span');
  timerIntime.className = `timer-type ${timer.text === '出勤' ? 'in' : 'out'}`;
  timerIntime.textContent = timer.text;
  
  li.append(timerName, timerIntime, timerTime);
  timeList.prepend(li);
}

const todayStr = new Date().toISOString().slice(0, 10);

const renderBySelectedDate = (dateStr) => {
  timeList.innerHTML = '';

  const todayTimers = timers.filter(timer => timer.date === dateStr);
  todayTimers.forEach((timer, index) => {
    // 元のtimers配列でのインデックスを取得
    const originalIndex = timers.findIndex(t => 
      t.name === timer.name && 
      t.text === timer.text && 
      t.time === timer.time && 
      t.date === timer.date
    );
    renderTimer(timer, originalIndex);
  });
};

renderBySelectedDate(todayStr);




