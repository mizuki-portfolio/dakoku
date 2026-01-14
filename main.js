"use strict";

const intime = document.querySelector('#intime');
const today = document.querySelector('#today');
const todaytime = document.querySelector('#todayTime');
const namesli = document.querySelectorAll('#names li');
const names = document.querySelector('.names');
const overlaynames = document.querySelector('.overlay-names');
const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const checkIn = document.querySelector('#check-in');
const checkOut = document.querySelector('#check-out');
const close = document.querySelector('#close');
const close2 = document.querySelector('#close2');


let timers;
let selectedName = '';


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

namesli.forEach((name) => {
  name.addEventListener('click', () => {
    selectedName = name.textContent;
    modal.classList.add('correct');
    overlay.classList.add('correct');
    names.classList.remove('correct');
    overlaynames.classList.remove('correct');
  })
});

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
  renderTimer(timers[0])

  modal.classList.remove('correct');
  overlay.classList.remove('correct');
  setTimers();
})

checkOut.addEventListener('click', () => {
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
  renderTimer(timers[0])

  modal.classList.remove('correct');
  overlay.classList.remove('correct');

  setTimers();
})

const timeList = document.querySelector('.timer ul')

const renderTimer = (timer) => {
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
  li.append(timerName, timerIntime, timerTime,)
  timeList.prepend(li);
}

const calendar = document.querySelector('#calendar');

const todayStr = new Date().toISOString().slice(0, 10);
calendar.value = todayStr;

const renderBySelectedDate = (dateStr) => {
  timeList.innerHTML = '';

  timers.forEach(timer => {
    if (timer.date === dateStr) {
      renderTimer(timer);
    }
  });
};

calendar.addEventListener('change', () => {
  renderBySelectedDate(calendar.value);
});

renderBySelectedDate(todayStr);




