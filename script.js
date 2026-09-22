/**
 * 認識月曆與心情 - SEN 幼兒互動遊戲
 * 特色：直觀閱讀實體月曆、保留完成畫面供師生分享（無覆蓋彈窗）、句子放大25%、心情放大30%、重啟邏輯完整健全
 */

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 當天真實系統時間
function getTodayInfo() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: WEEKDAYS[now.getDay()],
    dayIdx: now.getDay()
  };
}

let today = getTodayInfo();
let currentMode = 'easy'; // 'easy' 或 'hard'

let state = {
  dateMatched: { year: false, month: false, day: false, weekday: false },
  selectedCardId: null,
  isDateStepFinished: false,
  selectedMood: null
};

// DOM 元素引用
const container = document.querySelector('.game-container');
const feedbackBanner = document.getElementById('feedback-banner');
const cardYear = document.getElementById('card-year');
const cardMonth = document.getElementById('card-month');
const calGrid = document.getElementById('cal-grid');
const moodSection = document.getElementById('mood-section');
const moodDeck = document.getElementById('mood-deck');
const moodPromptTitle = document.getElementById('mood-prompt-title');
const btnRestart = document.getElementById('btn-restart');
const btnModeEasy = document.getElementById('btn-mode-easy');
const btnModeHard = document.getElementById('btn-mode-hard');

// 正向教育回饋提示列
function notifyFeedback(text, type = 'normal') {
  feedbackBanner.textContent = text;
  feedbackBanner.className = 'feedback-banner';
  if (type === 'try-again') feedbackBanner.classList.add('try-again');
  if (type === 'success') feedbackBanner.classList.add('step-correct');
}

// 建立放大版月曆
function renderCalendarPlate() {
  cardYear.textContent = `${today.year}年`;
  cardMonth.textContent = `${today.month}月`;
  cardYear.classList.remove('placed', 'flash-focus', 'selected-tap');
  cardMonth.classList.remove('placed', 'flash-focus', 'selected-tap');

  bindUniversalDrag(cardYear, handleDateMatch);
  bindUniversalDrag(cardMonth, handleDateMatch);

  calGrid.innerHTML = '';

  // 星期標題
  WEEKDAYS.forEach((w, idx) => {
    if (idx === today.dayIdx && !state.isDateStepFinished) {
      const wCard = document.createElement('div');
      wCard.className = 'source-card card-weekday';
      wCard.id = 'card-weekday';
      wCard.setAttribute('data-type', 'weekday');
      wCard.textContent = w;
      bindUniversalDrag(wCard, handleDateMatch);
      calGrid.appendChild(wCard);
    } else {
      const wCell = document.createElement('div');
      wCell.className = 'grid-cell week-header';
      wCell.textContent = w;
      calGrid.appendChild(wCell);
    }
  });

  const firstDayOfWeek = new Date(today.year, today.month - 1, 1).getDay();
  const daysInMonth = new Date(today.year, today.month, 0).getDate();

  for (let b = 0; b < firstDayOfWeek; b++) {
    const blank = document.createElement('div');
    blank.className = 'grid-cell';
    calGrid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    if (d === today.day) {
      if (!state.isDateStepFinished) {
        // 第一階段：當天作為「日期可拖曳卡」
        const dayCard = document.createElement('div');
        dayCard.className = 'source-card card-day';
        dayCard.id = 'card-day';
        dayCard.setAttribute('data-type', 'day');
        dayCard.textContent = `${d}日`;
        bindUniversalDrag(dayCard, handleDateMatch);
        calGrid.appendChild(dayCard);
      } else {
        // 第二階段：當天轉為「心情放置槽」
        const targetCell = document.createElement('div');
        targetCell.className = 'grid-cell today-slot';
        targetCell.id = 'today-mood-dropzone';
        if (state.selectedMood) {
          targetCell.classList.add('mood-filled');
          targetCell.innerHTML = `<span>${d}日</span><span style="font-size:1.8rem">${state.selectedMood.emoji}</span>`;
        } else {
          targetCell.innerHTML = `<span>${d}日</span><small>放心情</small>`;
        }
        setupMoodDropZone(targetCell);
        calGrid.appendChild(targetCell);
      }
    } else {
      const dCell = document.createElement('div');
      dCell.className = 'grid-cell';
      dCell.textContent = d;
      calGrid.appendChild(dCell);
    }
  }
}

// 支援「觸控/滑鼠拖曳」與「點選配對」雙機制
function bindUniversalDrag(element, onDropCallback) {
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging = false;

  element.onclick = () => {
    if (isDragging || element.classList.contains('placed')) return;
    document.querySelectorAll('.source-card, .mood-card').forEach(c => c.classList.remove('selected-tap'));
    element.classList.add('selected-tap');
    state.selectedCardId = element.id;
    notifyFeedback(`選好囉！請點選目標空格放進去！`);
  };

  element.ontouchstart = (e) => {
    if (element.classList.contains('placed')) return;
    isDragging = false;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    element.classList.add('dragging');
  };

  element.ontouchmove = (e) => {
    if (element.classList.contains('placed')) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartX) > 8 || Math.abs(t.clientY - touchStartY) > 8) {
      isDragging = true;
    }
    element.style.position = 'fixed';
    element.style.left = `${t.clientX - 50}px`;
    element.style.top = `${t.clientY - 30}px`;
    element.style.zIndex = '1000';
  };

  element.ontouchend = (e) => {
    if (element.classList.contains('placed')) return;
    element.classList.remove('dragging');
    const t = e.changedTouches[0];
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.zIndex = '';

    const hitEl = document.elementFromPoint(t.clientX, t.clientY);
    const dropTarget = hitEl ? (hitEl.closest('.sentence-slot') || hitEl.closest('#today-mood-dropzone')) : null;

    if (dropTarget) {
      onDropCallback(element, dropTarget);
    }
    setTimeout(() => { isDragging = false; }, 50);
  };
}

// 監聽第一階段句子空格
function setupSentenceSlots() {
  document.querySelectorAll('.sentence-slot').forEach(slot => {
    slot.onclick = () => {
      // 若已填滿，點擊觸發月曆對應位置閃亮
      if (slot.classList.contains('filled')) {
        flashCalendarSource(slot.getAttribute('data-type'));
        return;
      }
      if (state.selectedCardId) {
        const card = document.getElementById(state.selectedCardId);
        if (card && card.classList.contains('source-card')) {
          handleDateMatch(card, slot);
        }
      }
    };
    slot.ondragover = (e) => e.preventDefault();
  });
}

// 配對判定 (月曆 -> 句子)
function handleDateMatch(card, slot) {
  const cardType = card.getAttribute('data-type');
  const slotType = slot.getAttribute('data-type');

  if (cardType === slotType) {
    slot.textContent = card.textContent;
    slot.classList.add('filled');
    card.classList.add('placed');
    state.dateMatched[cardType] = true;
    state.selectedCardId = null;

    notifyFeedback(`好棒的觀察！成功把「${card.textContent}」放進句子裡！`, 'success');
    checkDateStepComplete();
  } else {
    // 嚴格落實正向教育指定鼓勵語句
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
    if (state.selectedCardId) {
      card.classList.remove('selected-tap');
      state.selectedCardId = null;
    }
  }
}

// 朗讀點擊時月曆同步閃亮
function flashCalendarSource(type) {
  const map = { year: 'card-year', month: 'card-month', day: 'card-day', weekday: 'card-weekday' };
  const target = document.getElementById(map[type]);
  if (target) {
    document.querySelectorAll('.source-card').forEach(c => c.classList.remove('flash-focus'));
    target.classList.add('flash-focus');
    setTimeout(() => target.classList.remove('flash-focus'), 1600);
  }
}

// 句子完成 -> 開啟心情互動
function checkDateStepComplete() {
  const isAll = Object.values(state.dateMatched).every(Boolean);
  if (isAll) {
    state.isDateStepFinished = true;
    document.getElementById('sentence-guide-txt').textContent = '🗣️ 太棒了！請跟著讀一讀句子，點擊詞彙可觀察月曆哪裡在發光：';
    notifyFeedback('太棒了！句子填好囉！現在請看看今天的心情！', 'success');

    moodSection.classList.remove('hidden');
    renderCalendarPlate();
    renderMoodDeck();
  }
}

// 生成心情情緒卡片 (放大30%)
function renderMoodDeck() {
  moodDeck.innerHTML = '';

  const easyMoods = [
    { id: 'm-happy', emoji: '😊', label: '開心' },
    { id: 'm-sad', emoji: '😢', label: '傷心' },
    { id: 'm-angry', emoji: '😡', label: '生氣' },
    { id: 'm-scared', emoji: '😨', label: '害怕' }
  ];

  const advancedMoods = [
    ...easyMoods,
    { id: 'm-disappointed', emoji: '😞', label: '失望' },
    { id: 'm-nervous', emoji: '😬', label: '緊張' },
    { id: 'm-excited', emoji: '🤩', label: '興奮' },
    { id: 'm-worried', emoji: '😟', label: '擔心' }
  ];

  const list = currentMode === 'easy' ? easyMoods : advancedMoods;

  list.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mood-card';
    card.id = m.id;
    card.setAttribute('data-emoji', m.emoji);
    card.setAttribute('data-label', m.label);
    card.innerHTML = `<span class="mood-emoji">${m.emoji}</span><span>${m.label}</span>`;

    bindUniversalDrag(card, handleMoodMatch);
    moodDeck.appendChild(card);
  });
}

// 心情放置槽監聽
function setupMoodDropZone(dropZone) {
  dropZone.onclick = () => {
    if (state.selectedCardId) {
      const card = document.getElementById(state.selectedCardId);
      if (card && card.classList.contains('mood-card')) {
        handleMoodMatch(card, dropZone);
      }
    }
  };
  dropZone.ondragover = (e) => e.preventDefault();
}

// 心情放入判定 (保留畫面，不彈出讚賞視窗)
function handleMoodMatch(card, dropZone) {
  if (dropZone.id === 'today-mood-dropzone') {
    const emoji = card.getAttribute('data-emoji');
    const label = card.getAttribute('data-label');
    state.selectedMood = { emoji, label };

    // 更新月曆當天格子
    dropZone.innerHTML = `<span>${today.day}日</span><span style="font-size:1.8rem">${emoji}</span>`;
    dropZone.classList.add('mood-filled');

    // 更新下方引導提示，保留畫面讓幼兒分享原因
    moodPromptTitle.textContent = `💖 今天的心情是「${label} ${emoji}」！請小朋友和大家分享一下原因吧：`;
    notifyFeedback(`太棒了！今天的心情是「${label}」！你做得非常好！`, 'success');

    // 移除未選取的其他卡片或標註當前選中卡片
    document.querySelectorAll('.mood-card').forEach(c => {
      if (c.id !== card.id) {
        c.style.opacity = '0.35';
        c.style.pointerEvents = 'none';
      } else {
        c.classList.add('selected-tap');
      }
    });
  } else {
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
  }
}

// 完全重啟遊戲 (徹底重設所有狀態與 DOM)
function resetGameFull() {
  today = getTodayInfo();
  state = {
    dateMatched: { year: false, month: false, day: false, weekday: false },
    selectedCardId: null,
    isDateStepFinished: false,
    selectedMood: null
  };

  // 重設句子文字與樣式
  document.getElementById('target-year').textContent = '____年';
  document.getElementById('target-month').textContent = '____月';
  document.getElementById('target-day').textContent = '____日';
  document.getElementById('target-weekday').textContent = '星期____';

  document.querySelectorAll('.sentence-slot').forEach(s => {
    s.classList.remove('filled');
  });

  // 重設引導語與隱藏心情區
  document.getElementById('sentence-guide-txt').textContent = '🗣️ 請把月曆上的字卡拖進句子空格裡，完成後一起朗讀：';
  moodPromptTitle.textContent = '💖 今天的心情怎麼樣？請把情緒卡片拉到當天的月曆格子中：';
  moodSection.classList.add('hidden');
  moodDeck.innerHTML = '';

  notifyFeedback('請在月曆中找出正確卡片，拉到句子裡！');

  // 切換模式樣式
  if (currentMode === 'easy') {
    container.classList.add('easy-mode');
  } else {
    container.classList.remove('easy-mode');
  }

  // 重繪月曆板面
  renderCalendarPlate();
  setupSentenceSlots();
}

// 難度按鈕切換
btnModeEasy.onclick = () => {
  currentMode = 'easy';
  btnModeEasy.classList.add('active');
  btnModeHard.classList.remove('active');
  resetGameFull();
};

btnModeHard.onclick = () => {
  currentMode = 'hard';
  btnModeHard.classList.add('active');
  btnModeEasy.classList.remove('active');
  resetGameFull();
};

// 頂部常駐「再玩一次」事件綁定
btnRestart.onclick = resetGameFull;

// 程式開局啟動
container.classList.add('easy-mode');
renderCalendarPlate();
setupSentenceSlots();
