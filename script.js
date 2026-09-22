/**
 * 認識月曆：看月曆讀句子 - SEN 幼兒互動學習遊戲
 * 特色：真實月曆極大化、月曆中直接抓取卡片、初階色彩鷹架相配、正向教育回饋
 */

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 動態讀取當天真實日期
function fetchTodayData() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: WEEKDAY_NAMES[now.getDay()],
    dayOfWeekIdx: now.getDay()
  };
}

let today = fetchTodayData();
let currentMode = 'easy'; // 'easy' 或 'hard'

let state = {
  matched: { year: false, month: false, day: false, weekday: false },
  selectedCardId: null
};

// DOM 元素引用
const viewport = document.querySelector('.game-viewport');
const feedbackBanner = document.getElementById('feedback-banner');
const cardYear = document.getElementById('card-year');
const cardMonth = document.getElementById('card-month');
const calGridPlate = document.getElementById('cal-grid-plate');
const modalCelebrate = document.getElementById('modal-celebrate');
const btnRestart = document.getElementById('btn-restart');
const btnModeEasy = document.getElementById('btn-mode-easy');
const btnModeHard = document.getElementById('btn-mode-hard');

// 正向教育回饋提示列
function notifyFeedback(text, type = 'normal') {
  feedbackBanner.textContent = text;
  feedbackBanner.className = 'feedback-box';
  if (type === 'try-again') feedbackBanner.classList.add('try-again');
  if (type === 'success') feedbackBanner.classList.add('step-correct');
}

// 繪製放大的實體月曆板面
function buildCalendarBoard() {
  // 1. 設定頂部 年份 與 月份 卡片
  cardYear.textContent = `${today.year}年`;
  cardMonth.textContent = `${today.month}月`;
  setupUniversalCardInteractions(cardYear);
  setupUniversalCardInteractions(cardMonth);

  // 2. 清空並繪製星期與日期網格
  calGridPlate.innerHTML = '';

  // 星期列（當天的星期幾轉為可拖曳卡片）
  WEEKDAY_NAMES.forEach((wName, idx) => {
    if (idx === today.dayOfWeekIdx) {
      const wCard = document.createElement('div');
      wCard.className = 'source-card card-weekday';
      wCard.id = 'card-weekday';
      wCard.setAttribute('data-type', 'weekday');
      wCard.textContent = wName;
      setupUniversalCardInteractions(wCard);
      calGridPlate.appendChild(wCard);
    } else {
      const headerCell = document.createElement('div');
      headerCell.className = 'grid-cell week-header';
      headerCell.textContent = wName;
      calGridPlate.appendChild(headerCell);
    }
  });

  // 計算該月天數與第一天的星期
  const firstDayOfWeek = new Date(today.year, today.month - 1, 1).getDay();
  const daysInMonth = new Date(today.year, today.month, 0).getDate();

  // 空白填充
  for (let b = 0; b < firstDayOfWeek; b++) {
    const blank = document.createElement('div');
    blank.className = 'grid-cell';
    calGridPlate.appendChild(blank);
  }

  // 渲染日數（當天變為可拖曳卡片，其餘為一般日期格）
  for (let d = 1; d <= daysInMonth; d++) {
    if (d === today.day) {
      const dayCard = document.createElement('div');
      dayCard.className = 'source-card card-day';
      dayCard.id = 'card-day';
      dayCard.setAttribute('data-type', 'day');
      dayCard.textContent = `${d}日`;
      setupUniversalCardInteractions(dayCard);
      calGridPlate.appendChild(dayCard);
    } else {
      const normalDayCell = document.createElement('div');
      normalDayCell.className = 'grid-cell';
      normalDayCell.textContent = d;
      calGridPlate.appendChild(normalDayCell);
    }
  }
}

// 支援「觸控/滑鼠拖曳」與「二段式點擊」雙相容互動
function setupUniversalCardInteractions(cardEl) {
  let touchStartX = 0;
  let touchStartY = 0;
  let isMoving = false;

  // 點擊選取模式 (防小肌肉手震與拖曳不適應)
  cardEl.addEventListener('click', () => {
    if (isMoving || cardEl.classList.contains('placed')) return;
    document.querySelectorAll('.source-card').forEach(c => c.classList.remove('selected-tap'));
    cardEl.classList.add('selected-tap');
    state.selectedCardId = cardEl.id;
    notifyFeedback(`選好囉！請點選下方句子裡的目標空格！`);
  });

  // 觸控拖曳模式
  cardEl.addEventListener('touchstart', (e) => {
    if (cardEl.classList.contains('placed')) return;
    isMoving = false;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    cardEl.classList.add('dragging');
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    if (cardEl.classList.contains('placed')) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartX) > 8 || Math.abs(t.clientY - touchStartY) > 8) {
      isMoving = true;
    }
    cardEl.style.position = 'fixed';
    cardEl.style.left = `${t.clientX - 45}px`;
    cardEl.style.top = `${t.clientY - 25}px`;
    cardEl.style.zIndex = '1000';
  }, { passive: true });

  cardEl.addEventListener('touchend', (e) => {
    if (cardEl.classList.contains('placed')) return;
    cardEl.classList.remove('dragging');
    const t = e.changedTouches[0];
    cardEl.style.position = ''; cardEl.style.left = ''; cardEl.style.top = ''; cardEl.style.zIndex = '';

    const hitEl = document.elementFromPoint(t.clientX, t.clientY);
    const dropTarget = hitEl ? hitEl.closest('.sentence-slot') : null;

    if (dropTarget) {
      handleMatchAttempt(cardEl, dropTarget);
    }
    setTimeout(() => { isMoving = false; }, 50);
  });
}

// 監聽句子目標槽點擊
function setupSentenceSlots() {
  document.querySelectorAll('.sentence-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      // 若已填入完成，點擊則觸發與月曆的「同步閃爍」提示
      if (slot.classList.contains('filled')) {
        triggerFlashSync(slot.getAttribute('data-type'));
        return;
      }

      // 若處於選卡狀態，執行配對
      if (state.selectedCardId) {
        const card = document.getElementById(state.selectedCardId);
        if (card) handleMatchAttempt(card, slot);
      }
    });

    slot.addEventListener('dragover', (e) => e.preventDefault());
  });
}

// 配對判定與正向回饋邏輯
function handleMatchAttempt(card, slot) {
  const cardType = card.getAttribute('data-type');
  const slotType = slot.getAttribute('data-type');

  if (cardType === slotType) {
    // 配對成功
    slot.textContent = card.textContent;
    slot.classList.add('filled', 'clickable-read');
    card.classList.add('placed');
    state.matched[cardType] = true;
    state.selectedCardId = null;

    notifyFeedback(`好棒的觀察！成功把「${card.textContent}」放進句子裡！`, 'success');
    checkAllComplete();
  } else {
    // 配對失敗：出示指定正向鼓勵語句
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
    if (state.selectedCardId) {
      card.classList.remove('selected-tap');
      state.selectedCardId = null;
    }
  }
}

// 點擊句子中的詞彙，月曆原位置同步發光閃亮 (建立位置概念)
function triggerFlashSync(type) {
  const cardMap = {
    year: 'card-year',
    month: 'card-month',
    day: 'card-day',
    weekday: 'card-weekday'
  };

  const targetCard = document.getElementById(cardMap[type]);
  if (targetCard) {
    document.querySelectorAll('.source-card').forEach(c => c.classList.remove('flash-focus'));
    targetCard.classList.add('flash-focus');
    setTimeout(() => {
      targetCard.classList.remove('flash-focus');
    }, 1800);
  }
}

// 檢查是否所有空格均已完成
function checkAllComplete() {
  const isDone = Object.values(state.matched).every(Boolean);
  if (isDone) {
    notifyFeedback('太棒了！請跟著讀一讀句子，也可以點擊詞彙看看月曆哪裡在發光！', 'success');
    setTimeout(() => {
      document.getElementById('celebrate-text').textContent = 
        `你學會了閱讀月曆，並完成了句子：「今天是 ${today.year}年 ${today.month}月 ${today.day}日 ${today.weekday}」！`;
      modalCelebrate.classList.remove('hidden');
    }, 1800);
  }
}

// 重置與重置介面
function resetGameEngine() {
  today = fetchTodayData();
  state = {
    matched: { year: false, month: false, day: false, weekday: false },
    selectedCardId: null
  };

  // 重設句子空格
  document.getElementById('target-year').innerHTML = '<span class="slot-placeholder">____年</span>';
  document.getElementById('target-month').innerHTML = '<span class="slot-placeholder">____月</span>';
  document.getElementById('target-day').innerHTML = '<span class="slot-placeholder">____日</span>';
  document.getElementById('target-weekday').innerHTML = '<span class="slot-placeholder">星期____</span>';

  document.querySelectorAll('.sentence-slot').forEach(s => {
    s.classList.remove('filled', 'clickable-read');
  });

  modalCelebrate.classList.add('hidden');
  notifyFeedback('請在月曆中找出正確的卡片，拉到下方句子裡！');

  // 切換色彩提示模式
  if (currentMode === 'easy') {
    viewport.classList.add('easy-mode');
  } else {
    viewport.classList.remove('easy-mode');
  }

  buildCalendarBoard();
}

// 難度按鈕監聽
btnModeEasy.addEventListener('click', () => {
  currentMode = 'easy';
  btnModeEasy.classList.add('active');
  btnModeHard.classList.remove('active');
  resetGameEngine();
});

btnModeHard.addEventListener('click', () => {
  currentMode = 'hard';
  btnModeHard.classList.add('active');
  btnModeEasy.classList.remove('active');
  resetGameEngine();
});

btnRestart.addEventListener('click', resetGameEngine);

// 程式啟動
viewport.classList.add('easy-mode');
buildCalendarBoard();
setupSentenceSlots();
