/**
 * 認識月曆：看月曆讀句子與心情
 * 完整前端互動腳本 (含自動螢幕縮放與拖曳修正)
 */

// ===============================
// 1. 全域變數與當前遊戲狀態
// ===============================
let currentScale = 1; // 記錄當前畫面縮放倍率
let currentMode = 'easy'; // 'easy' 或 'hard'

// 題目預設資料 (可擴充更多日期題目)
const gameData = {
  year: 2026,
  month: 10,
  day: 13,
  weekday: '二',
  weekdayFull: '星期二'
};

const filledSlots = {
  year: false,
  month: false,
  day: false,
  weekday: false
};

const moodList = [
  { emoji: '😄', label: '開心' },
  { emoji: '☀️', label: '平靜' },
  { emoji: '🤩', label: '興奮' },
  { emoji: '🥱', label: '疲倦' },
  { emoji: '😢', label: '難過' }
];

// ===============================
// 2. 螢幕等比例自適應縮放 (核心函式)
// ===============================
function fitGameToScreen() {
  const container = document.getElementById('game-container');
  if (!container) return;

  const baseWidth = 1200;  // 基準寬度
  const baseHeight = 750;  // 基準高度

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const scaleX = windowWidth / baseWidth;
  const scaleY = windowHeight / baseHeight;
  currentScale = Math.min(scaleX, scaleY);

  container.style.transform = `scale(${currentScale})`;
}

// ===============================
// 3. 月曆生成邏輯
// ===============================
function initCalendar() {
  const { year, month, day } = gameData;

  // 填入頂部年、月字卡
  const yearCard = document.getElementById('card-year');
  const monthCard = document.getElementById('card-month');
  
  if (yearCard) {
    yearCard.textContent = `${year}年`;
    yearCard.setAttribute('draggable', 'true');
    yearCard.dataset.value = `${year}年`;
    setupCardInteractions(yearCard, 'year');
  }

  if (monthCard) {
    monthCard.textContent = `${month}月`;
    monthCard.setAttribute('draggable', 'true');
    monthCard.dataset.value = `${month}月`;
    setupCardInteractions(monthCard, 'month');
  }

  // 建立月曆格子
  const calGrid = document.getElementById('cal-grid');
  if (!calGrid) return;
  calGrid.innerHTML = '';

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  // 表頭：星期欄位
  weekdays.forEach(w => {
    const headCell = document.createElement('div');
    headCell.className = 'cal-header-cell';
    headCell.textContent = `週${w}`;
    headCell.dataset.weekday = w;
    headCell.id = `header-weekday-${w}`;
    calGrid.appendChild(headCell);
  });

  // 計算該月第一天是星期幾 & 總天數
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  // 填補月初空白格
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-cell empty';
    calGrid.appendChild(emptyCell);
  }

  // 填入日期格
  for (let d = 1; d <= totalDays; d++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'cal-cell';
    dayCell.textContent = d;
    dayCell.id = `cal-day-${d}`;

    // 如果是目標日期
    if (d === day) {
      dayCell.classList.add('target-day-cell');
      dayCell.setAttribute('draggable', 'true');
      dayCell.dataset.type = 'day';
      dayCell.dataset.value = `${d}日`;
      setupCardInteractions(dayCell, 'day');

      // 進階版：關聯星期字卡
      const weekdayCell = document.getElementById(`header-weekday-${gameData.weekday}`);
      if (weekdayCell) {
        weekdayCell.setAttribute('draggable', 'true');
        weekdayCell.dataset.type = 'weekday';
        weekdayCell.dataset.value = `星期${gameData.weekday}`;
        setupCardInteractions(weekdayCell, 'weekday');
      }
    }

    calGrid.appendChild(dayCell);
  }
}

// ===============================
// 4. 拖曳與觸控相容處理 (適應 Scale)
// ===============================
let draggedItem = null;
let touchClone = null;

function setupCardInteractions(element, type) {
  // 原生 Drag & Drop (桌機滑鼠)
  element.addEventListener('dragstart', (e) => {
    draggedItem = { element, type, value: element.dataset.value };
    e.dataTransfer.setData('text/plain', type);
    element.classList.add('dragging');
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
  });

  // 觸控事件 (iPad 與手機，考慮 Scale 座標運算)
  element.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    draggedItem = { element, type, value: element.dataset.value };

    // 建立跟隨手指移動的浮動鏡像
    touchClone = element.cloneNode(true);
    touchClone.classList.add('touch-dragging-clone');
    touchClone.style.position = 'fixed';
    touchClone.style.left = `${touch.clientX - 30}px`;
    touchClone.style.top = `${touch.clientY - 30}px`;
    touchClone.style.zIndex = '9999';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.opacity = '0.85';
    document.body.appendChild(touchClone);
  }, { passive: false });

  element.addEventListener('touchmove', (e) => {
    if (!touchClone) return;
    const touch = e.touches[0];
    touchClone.style.left = `${touch.clientX - 30}px`;
    touchClone.style.top = `${touch.clientY - 30}px`;
    e.preventDefault(); // 防止拖拉時螢幕滾動
  }, { passive: false });

  element.addEventListener('touchend', (e) => {
    if (touchClone) {
      touchClone.remove();
      touchClone = null;
    }
    const touch = e.changedTouches[0];
    // 找出釋放點下方的元素
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropSlot = targetElement ? targetElement.closest('.sentence-slot') : null;

    if (dropSlot && draggedItem) {
      handleDrop(dropSlot, draggedItem);
    }
    draggedItem = null;
  });
}

// 句子空格的放置區監聽
function initDropSlots() {
  const slots = document.querySelectorAll('.sentence-slot');
  slots.forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('slot-hover');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('slot-hover');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('slot-hover');
      if (draggedItem) {
        handleDrop(slot, draggedItem);
      }
    });

    // 點擊已填入字詞，可觸發月曆高亮觀察
    slot.addEventListener('click', () => {
      const slotType = slot.dataset.type;
      highlightCalendarItem(slotType);
    });
  });
}

function handleDrop(slot, item) {
  const slotType = slot.dataset.type;
  const feedback = document.getElementById('feedback-banner');

  if (slotType === item.type) {
    slot.textContent = item.value;
    slot.classList.add('slot-filled');
    filledSlots[slotType] = true;

    // 回饋提示
    feedback.textContent = `太棒了！答對了「${item.value}」！✨`;
    feedback.style.color = '#2e7d32';

    // 觸發高亮提示
    highlightCalendarItem(slotType);

    // 檢查是否全數完成
    checkCompletion();
  } else {
    feedback.textContent = `再試試看喔！這張卡片放這裡不太合適～ 🤔`;
    feedback.style.color = '#d32f2f';
    slot.classList.add('slot-error');
    setTimeout(() => slot.classList.remove('slot-error'), 600);
  }
}

// ===============================
// 5. 月曆發光聯動效果
// ===============================
function highlightCalendarItem(type) {
  // 移除所有先前的發光樣式
  document.querySelectorAll('.glow-focus').forEach(el => el.classList.remove('glow-focus'));

  if (type === 'year') {
    const el = document.getElementById('card-year');
    if (el) el.classList.add('glow-focus');
  } else if (type === 'month') {
    const el = document.getElementById('card-month');
    if (el) el.classList.add('glow-focus');
  } else if (type === 'day') {
    const el = document.getElementById(`cal-day-${gameData.day}`);
    if (el) el.classList.add('glow-focus');
  } else if (type === 'weekday') {
    const el = document.getElementById(`header-weekday-${gameData.weekday}`);
    if (el) el.classList.add('glow-focus');
  }
}

// 檢查所有空格是否填寫完成
function checkCompletion() {
  const isComplete = currentMode === 'easy'
    ? (filledSlots.year && filledSlots.month && filledSlots.day)
    : (filledSlots.year && filledSlots.month && filledSlots.day && filledSlots.weekday);

  if (isComplete) {
    const feedback = document.getElementById('feedback-banner');
    feedback.textContent = '🌟 恭喜你完成整個句子！現在選擇你今天的心情吧！';
    feedback.style.color = '#e65100';

    // 顯示心情選擇區
    const moodSection = document.getElementById('mood-section');
    if (moodSection) {
      moodSection.classList.remove('hidden');
    }
  }
}

// ===============================
// 6. 心情互動區初始化
// ===============================
function initMoodSection() {
  const moodDeck = document.getElementById('mood-deck');
  if (!moodDeck) return;
  moodDeck.innerHTML = '';

  moodList.forEach(m => {
    const card = document.createElement('button');
    card.className = 'mood-card';
    card.innerHTML = `<span class="mood-emoji">${m.emoji}</span><span class="mood-name">${m.label}</span>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const feedback = document.getElementById('feedback-banner');
      feedback.textContent = `收到！今天的心情是「${m.label}」${m.emoji}，非常棒的學習！🎉`;
      feedback.style.color = '#1565c0';
    });
    moodDeck.appendChild(card);
  });
}

// ===============================
// 7. 難度切換與重設
// ===============================
function setupButtons() {
  const btnEasy = document.getElementById('btn-mode-easy');
  const btnHard = document.getElementById('btn-mode-hard');
  const btnRestart = document.getElementById('btn-restart');
  const targetWeekdaySlot = document.getElementById('target-weekday');

  btnEasy.addEventListener('click', () => {
    currentMode = 'easy';
    btnEasy.classList.add('active');
    btnHard.classList.remove('active');
    if (targetWeekdaySlot) targetWeekdaySlot.style.display = 'none'; // 初階隱藏星期格
    restartGame();
  });

  btnHard.addEventListener('click', () => {
    currentMode = 'hard';
    btnHard.classList.add('active');
    btnEasy.classList.remove('active');
    if (targetWeekdaySlot) targetWeekdaySlot.style.display = 'flex'; // 進階顯示星期格
    restartGame();
  });

  btnRestart.addEventListener('click', restartGame);
}

function restartGame() {
  // 重設填入狀態
  filledSlots.year = false;
  filledSlots.month = false;
  filledSlots.day = false;
  filledSlots.weekday = false;

  // 重設句子文字
  document.getElementById('target-year').textContent = '____年';
  document.getElementById('target-month').textContent = '____月';
  document.getElementById('target-day').textContent = '____日';
  document.getElementById('target-weekday').textContent = '星期____';

  document.querySelectorAll('.sentence-slot').forEach(s => s.classList.remove('slot-filled'));
  document.querySelectorAll('.glow-focus').forEach(el => el.classList.remove('glow-focus'));

  // 隱藏心情區
  const moodSection = document.getElementById('mood-section');
  if (moodSection) moodSection.classList.add('hidden');

  // 回復預設橫幅文字
  const feedback = document.getElementById('feedback-banner');
  feedback.textContent = '請在月曆中找出正確卡片，拉到句子裡！';
  feedback.style.color = '';

  initCalendar();
}

// ===============================
// 8. 程式啟動入口
// ===============================
window.addEventListener('DOMContentLoaded', () => {
  fitGameToScreen();
  initCalendar();
  initDropSlots();
  initMoodSection();
  setupButtons();

  // 根據預設模式更新 UI
  const targetWeekdaySlot = document.getElementById('target-weekday');
  if (currentMode === 'easy' && targetWeekdaySlot) {
    targetWeekdaySlot.style.display = 'none';
  }
});

// 視窗變更與旋轉監聽
window.addEventListener('resize', fitGameToScreen);
window.addEventListener('orientationchange', () => {
  setTimeout(fitGameToScreen, 200);
});
