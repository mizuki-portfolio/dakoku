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
  localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(defaultEmployees));
  return defaultEmployees;
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




