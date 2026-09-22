/**
 * 認識月曆與心情 - SEN 幼兒互動遊戲
 * 修正重點：點按句子中「年、月、日、星期」時，月曆中對應卡片/格子均能精準發光閃亮 (Pulse Flash)
 */

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 取得系統當天日期
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

// 正向教育回饋橫幅
function notifyFeedback(text, type = 'normal') {
  feedbackBanner.textContent = text;
  feedbackBanner.className = 'feedback-banner';
  if (type === 'try-again') feedbackBanner.classList.add('try-again');
  if (type === 'success') feedbackBanner.classList.add('step-correct');
}

// 建立月曆
function renderCalendarPlate() {
  cardYear.textContent = `${today.year}年`;
  cardMonth.textContent = `${today.month}月`;
  cardYear.className = 'source-card card-year';
  cardMonth.className = 'source-card card-month';

  bindUniversalDrag(cardYear, handleDateMatch);
  bindUniversalDrag(cardMonth, handleDateMatch);

  calGrid.innerHTML = '';

  // 星期列（保留 card-weekday 作為定位目標）
  WEEKDAYS.forEach((w, idx) => {
    if (idx === today.dayIdx) {
      const wCard = document.createElement('div');
      wCard.className = 'source-card card-weekday';
      wCard.id = 'card-weekday';
      wCard.setAttribute('data-type', 'weekday');
      wCard.textContent = w;
      if (state.dateMatched.weekday) {
        wCard.classList.add('placed');
      }
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

  // 日期格
  for (let d = 1; d <= daysInMonth; d++) {
    if (d === today.day) {
      if (!state.isDateStepFinished) {
        // 第一階段：可拖曳日期卡
        const dayCard = document.createElement('div');
        dayCard.className = 'source-card card-day';
        dayCard.id = 'card-day';
        dayCard.setAttribute('data-type', 'day');
        dayCard.textContent = `${d}日`;
        if (state.dateMatched.day) {
          dayCard.classList.add('placed');
        }
        bindUniversalDrag(dayCard, handleDateMatch);
        calGrid.appendChild(dayCard);
      } else {
        // 第二階段：當天轉為心情放置槽
        const targetCell = document.createElement('div');
        targetCell.className = 'grid-cell today-slot';
        targetCell.id = 'today-mood-dropzone';
        targetCell.setAttribute('data-day', d);
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

// 監聽句子填空空格點選
function setupSentenceSlots() {
  document.querySelectorAll('.sentence-slot').forEach(slot => {
    slot.onclick = () => {
      const slotType = slot.getAttribute('data-type');
      // 無論是否已填滿，點擊均觸發月曆同步發光提示！
      if (slot.classList.contains('filled')) {
        flashCalendarSource(slotType);
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
    // 配對成功時立即閃爍一次以建立位置聯結
    flashCalendarSource(cardType);
    checkDateStepComplete();
  } else {
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
    if (state.selectedCardId) {
      card.classList.remove('selected-tap');
      state.selectedCardId = null;
    }
  }
}

// ===================================================
// 核心修正：年、月、日、星期 全部精準同步發光 (Flash Sync)
// ===================================================
function flashCalendarSource(type) {
  let targetEl = null;

  if (type === 'year') {
    targetEl = document.getElementById('card-year');
  } else if (type === 'month') {
    targetEl = document.getElementById('card-month');
  } else if (type === 'day') {
    // 依當前階段抓取 card-day 或 today-mood-dropzone
    targetEl = document.getElementById('card-day') || document.getElementById('today-mood-dropzone');
  } else if (type === 'weekday') {
    targetEl = document.getElementById('card-weekday');
  }

  if (targetEl) {
    // 清除其他正在閃爍的項目
    document.querySelectorAll('.source-card, .grid-cell').forEach(el => {
      el.classList.remove('flash-focus');
    });

    // 加入高亮發光動畫
    targetEl.classList.add('flash-focus');

    // 1.8 秒後平滑恢復
    setTimeout(() => {
      targetEl.classList.remove('flash-focus');
    }, 1800);
  }
}

// 第一階段完成 -> 進入心情階段
function checkDateStepComplete() {
  const isAll = Object.values(state.dateMatched).every(Boolean);
  if (isAll) {
    state.isDateStepFinished = true;
    document.getElementById('sentence-guide-txt').textContent = '🗣️ 太棒了！請讀一讀句子，點擊「年、月、日、星期」觀察月曆哪裡在發光：';
    notifyFeedback('太棒了！句子填好囉！現在請看看今天的心情！', 'success');

    moodSection.classList.remove('hidden');
    renderCalendarPlate();
    renderMoodDeck();
  }
}

// 產生心情卡片
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

// 心情放入判定 (保留畫面供分享)
function handleMoodMatch(card, dropZone) {
  if (dropZone.id === 'today-mood-dropzone') {
    const emoji = card.getAttribute('data-emoji');
    const label = card.getAttribute('data-label');
    state.selectedMood = { emoji, label };

    dropZone.innerHTML = `<span>${today.day}日</span><span style="font-size:1.8rem">${emoji}</span>`;
    dropZone.classList.add('mood-filled');

    moodPromptTitle.textContent = `💖 今天的心情是「${label} ${emoji}」！請小朋友和大家分享一下原因吧：`;
    notifyFeedback(`謝謝你分享今天的心情是「${label}」！`, 'success');

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

// 健全重啟遊戲
function resetGameFull() {
  today = getTodayInfo();
  state = {
    dateMatched: { year: false, month: false, day: false, weekday: false },
    selectedCardId: null,
    isDateStepFinished: false,
    selectedMood: null
  };

  document.getElementById('target-year').textContent = '____年';
  document.getElementById('target-month').textContent = '____月';
  document.getElementById('target-day').textContent = '____日';
  document.getElementById('target-weekday').textContent = '星期____';

  document.querySelectorAll('.sentence-slot').forEach(s => {
    s.classList.remove('filled');
  });

  document.getElementById('sentence-guide-txt').textContent = '🗣️ 請把月曆上的字卡拖進句子空格裡，完成後點擊字詞觀察月曆發光：';
  moodPromptTitle.textContent = '💖 今天的心情怎麼樣？請把情緒卡片拉到當天的月曆格子中：';
  moodSection.classList.add('hidden');
  moodDeck.innerHTML = '';

  notifyFeedback('請在月曆中找出正確卡片，拉到句子裡！');

  if (currentMode === 'easy') {
    container.classList.add('easy-mode');
  } else {
    container.classList.remove('easy-mode');
  }

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

// 頂部常駐按鈕
btnRestart.onclick = resetGameFull;

// 程式開局啟動
container.classList.add('easy-mode');
renderCalendarPlate();
setupSentenceSlots();
