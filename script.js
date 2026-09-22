/**
 * 日曆小管家 - 認識今天與心情 EMOJI
 * 特性：iPad 橫向專用佈局、初階色彩提示底塊、心情分階與朗讀互動
 */

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 當天真實系統時間
function getTodaySystemInfo() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: WEEKDAYS[now.getDay()],
    dayOfWeekIndex: now.getDay()
  };
}

let todayInfo = getTodaySystemInfo();
let currentMode = 'easy'; // 'easy' 或 'hard'

let state = {
  dateMatched: { year: false, month: false, day: false, weekday: false },
  selectedItemId: null,
  selectedMoodData: null
};

// DOM 元素引用
const appWrapper = document.querySelector('.app-wrapper');
const feedbackBanner = document.getElementById('feedback-banner');
const viewTitle = document.getElementById('view-title');
const pageDate = document.getElementById('page-date');
const pageMood = document.getElementById('page-mood');
const dateCardsDeck = document.getElementById('date-cards-deck');
const moodCardsDeck = document.getElementById('mood-cards-deck');
const sentencePanel = document.getElementById('sentence-read-panel');
const btnNextPage = document.getElementById('btn-next-page');
const modalCelebrate = document.getElementById('modal-celebrate');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnModeEasy = document.getElementById('btn-mode-easy');
const btnModeHard = document.getElementById('btn-mode-hard');

// 正向教育回饋橫幅更新
function notifyFeedback(text, type = 'normal') {
  feedbackBanner.textContent = text;
  feedbackBanner.className = 'feedback-zone';
  if (type === 'try-again') feedbackBanner.classList.add('try-again');
  if (type === 'success') feedbackBanner.classList.add('step-correct');
}

// 產生第一頁待選卡片 (初階 4 張 vs 進階 8 張干擾項)
function generateDateCards() {
  const correctSet = [
    { id: 'cd-yr', type: 'year', text: `${todayInfo.year}年`, isCorrect: true, classTag: 'card-year' },
    { id: 'cd-mo', type: 'month', text: `${todayInfo.month}月`, isCorrect: true, classTag: 'card-month' },
    { id: 'cd-dy', type: 'day', text: `${todayInfo.day}日`, isCorrect: true, classTag: 'card-day' },
    { id: 'cd-wk', type: 'weekday', text: todayInfo.weekday, isCorrect: true, classTag: 'card-weekday' }
  ];

  if (currentMode === 'easy') return correctSet;

  const fakeYear = `${todayInfo.year - 1}年`;
  const fakeMonth = todayInfo.month === 12 ? '1月' : `${todayInfo.month + 1}月`;
  const fakeDay = todayInfo.day === 1 ? '15日' : `${todayInfo.day - 1}日`;
  const fakeWeekday = todayInfo.dayOfWeekIndex === 1 ? '星期三' : '星期一';

  const distractors = [
    { id: 'fk-yr', type: 'year', text: fakeYear, isCorrect: false, classTag: 'card-year' },
    { id: 'fk-mo', type: 'month', text: fakeMonth, isCorrect: false, classTag: 'card-month' },
    { id: 'fk-dy', type: 'day', text: fakeDay, isCorrect: false, classTag: 'card-day' },
    { id: 'fk-wk', type: 'weekday', text: fakeWeekday, isCorrect: false, classTag: 'card-weekday' }
  ];

  return [...correctSet, ...distractors];
}

// 產生第二頁心情 Emoji (初階 4 種 vs 進階 8 種)
function generateMoodData() {
  // 初階心情：開心、傷心、生氣、害怕
  const easyMoods = [
    { id: 'm-happy', emoji: '😊', label: '開心' },
    { id: 'm-sad', emoji: '😢', label: '傷心' },
    { id: 'm-angry', emoji: '😡', label: '生氣' },
    { id: 'm-scared', emoji: '😨', label: '害怕' }
  ];

  if (currentMode === 'easy') return easyMoods;

  // 進階心情：開心、傷心、生氣、害怕、失望、緊張、興奮、擔心
  const advancedMoods = [
    ...easyMoods,
    { id: 'm-disappointed', emoji: '😞', label: '失望' },
    { id: 'm-nervous', emoji: '😬', label: '緊張' },
    { id: 'm-excited', emoji: '🤩', label: '興奮' },
    { id: 'm-worried', emoji: '😟', label: '擔心' }
  ];

  return advancedMoods;
}

// 繪製日曆底板
function renderCalendarPlate(containerId, isMoodScreen = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];
  weekHeaders.forEach(h => {
    const el = document.createElement('div');
    el.className = isMoodScreen ? 'cal-slot-cell header' : 'mini-cell';
    el.style.fontWeight = 'bold';
    el.textContent = h;
    container.appendChild(el);
  });

  const firstDay = new Date(todayInfo.year, todayInfo.month - 1, 1).getDay();
  const totalDays = new Date(todayInfo.year, todayInfo.month, 0).getDate();

  for (let b = 0; b < firstDay; b++) {
    const blank = document.createElement('div');
    blank.className = isMoodScreen ? 'cal-slot-cell' : 'mini-cell';
    container.appendChild(blank);
  }

  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement('div');
    cell.className = isMoodScreen ? 'cal-slot-cell' : 'mini-cell';
    cell.textContent = d;

    if (d === todayInfo.day) {
      if (!isMoodScreen) {
        if (state.dateMatched.day) cell.classList.add('today-marked');
      } else {
        // 第二頁心情放置格
        cell.id = 'today-mood-slot';
        cell.classList.add('today-target-slot');
        if (state.selectedMoodData) {
          cell.innerHTML = `<span>${d}日</span><span>${state.selectedMoodData.emoji}</span>`;
          cell.classList.add('filled-mood');
        } else {
          cell.innerHTML = `<span>${d}日</span><small>放心情</small>`;
        }
      }
    }
    container.appendChild(cell);
  }
}

// 渲染第一頁待選卡片
function renderDateDeck() {
  dateCardsDeck.innerHTML = '';
  const cards = generateDateCards().sort(() => Math.random() - 0.5);

  cards.forEach(cardData => {
    const cardEl = document.createElement('div');
    cardEl.className = `choice-card ${cardData.classTag}`;
    cardEl.id = cardData.id;
    cardEl.textContent = cardData.text;
    cardEl.setAttribute('data-type', cardData.type);
    cardEl.setAttribute('data-correct', cardData.isCorrect);

    bindTouchAndMouseInteractions(cardEl, handleDateDrop);
    dateCardsDeck.appendChild(cardEl);
  });
}

// 渲染第二頁心情卡片
function renderMoodDeck() {
  moodCardsDeck.innerHTML = '';
  const moods = generateMoodData();

  moods.forEach(moodItem => {
    const moodEl = document.createElement('div');
    moodEl.className = 'mood-card-btn';
    moodEl.id = moodItem.id;
    moodEl.innerHTML = `<span class="emoji-icon">${moodItem.emoji}</span> <span>${moodItem.label}</span>`;
    moodEl.setAttribute('data-emoji', moodItem.emoji);
    moodEl.setAttribute('data-label', moodItem.label);

    bindTouchAndMouseInteractions(moodEl, handleMoodDrop);
    moodCardsDeck.appendChild(moodEl);
  });
}

// 跨裝置事件通用綁定（支援 Touch 拖曳與二段式點擊）
function bindTouchAndMouseInteractions(element, dropHandler) {
  let touchStartX = 0;
  let touchStartY = 0;
  let isMoving = false;

  // 點選模式
  element.addEventListener('click', () => {
    if (isMoving) return;
    document.querySelectorAll('.choice-card, .mood-card-btn').forEach(c => c.classList.remove('selected-tap'));
    element.classList.add('selected-tap');
    state.selectedItemId = element.id;
    notifyFeedback(`選好囉！請點選日曆中的目標空格放進去！`);
  });

  // 觸控拖曳模式
  element.addEventListener('touchstart', (e) => {
    isMoving = false;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    element.classList.add('dragging');
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartX) > 8 || Math.abs(t.clientY - touchStartY) > 8) {
      isMoving = true;
    }
    element.style.position = 'fixed';
    element.style.left = `${t.clientX - 50}px`;
    element.style.top = `${t.clientY - 25}px`;
    element.style.zIndex = '1000';
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    element.classList.remove('dragging');
    const t = e.changedTouches[0];
    element.style.position = ''; element.style.left = ''; element.style.top = ''; element.style.zIndex = '';

    const dropTarget = document.elementFromPoint(t.clientX, t.clientY);
    const validZone = dropTarget ? (dropTarget.closest('.drop-target') || dropTarget.closest('.today-target-slot')) : null;

    if (validZone) {
      dropHandler(element, validZone);
    }
    setTimeout(() => { isMoving = false; }, 50);
  });
}

// 監聽第一頁目標槽點選
function setupDropTargetClicks() {
  document.querySelectorAll('.drop-target').forEach(zone => {
    zone.addEventListener('click', () => {
      if (state.selectedItemId) {
        const card = document.getElementById(state.selectedItemId);
        if (card && card.classList.contains('choice-card')) {
          handleDateDrop(card, zone);
        }
      }
    });
    zone.addEventListener('dragover', (e) => e.preventDefault());
  });
}

// 第一頁配對判定
function handleDateDrop(card, targetZone) {
  const cardType = card.getAttribute('data-type');
  const zoneType = targetZone.getAttribute('data-type');
  const isCorrect = card.getAttribute('data-correct') === 'true';

  if (cardType === zoneType && isCorrect) {
    targetZone.textContent = card.textContent;
    targetZone.classList.add('filled');
    card.classList.add('vanished');
    state.dateMatched[cardType] = true;
    state.selectedItemId = null;

    notifyFeedback(`好棒的觀察！成功填入了「${card.textContent}」！`, 'success');
    renderCalendarPlate('p1-month-grid');
    checkDateStepFinished();
  } else {
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
    if (state.selectedItemId) {
      card.classList.remove('selected-tap');
      state.selectedItemId = null;
    }
  }
}

// 檢查第一頁是否全完成
function checkDateStepFinished() {
  const isAllDone = Object.values(state.dateMatched).every(Boolean);
  if (isAllDone) {
    sentencePanel.classList.remove('hidden');
    document.getElementById('lbl-year').textContent = `${todayInfo.year}年`;
    document.getElementById('lbl-month').textContent = `${todayInfo.month}月`;
    document.getElementById('lbl-day').textContent = `${todayInfo.day}日`;
    document.getElementById('lbl-weekday').textContent = todayInfo.weekday;
    notifyFeedback('太棒了！一起點擊字詞朗讀，完成後按下一頁！', 'success');
  }
}

// 點選朗讀字詞 -> 對應日曆位置同步閃爍提示
function bindReadingSentenceClicks() {
  document.querySelectorAll('.read-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetType = chip.getAttribute('data-target');
      const targetSlot = document.getElementById(`slot-${targetType}`);
      if (targetSlot) {
        document.querySelectorAll('.drop-target').forEach(z => z.classList.remove('slot-flash'));
        targetSlot.classList.add('slot-flash');
        setTimeout(() => {
          targetSlot.classList.remove('slot-flash');
        }, 1600);
      }
    });
  });
}

// 切換至第二頁（今天心情）
btnNextPage.addEventListener('click', () => {
  pageDate.classList.add('hidden');
  pageMood.classList.remove('hidden');
  viewTitle.textContent = '💖 今天的心情：日曆小管家';
  notifyFeedback('今天過得怎麼樣？把符合心情的 EMOJI 放進今天的格子裡！');

  document.getElementById('p2-month-title').textContent = `${todayInfo.year}年 ${todayInfo.month}月 心情日曆`;
  renderCalendarPlate('p2-mood-grid', true);
  renderMoodDeck();
  setupMoodTargetClicks();
});

// 第二頁目標槽點選
function setupMoodTargetClicks() {
  const target = document.getElementById('today-mood-slot');
  if (target) {
    target.addEventListener('click', () => {
      if (state.selectedItemId) {
        const card = document.getElementById(state.selectedItemId);
        if (card && card.classList.contains('mood-card-btn')) {
          handleMoodDrop(card, target);
        }
      }
    });
  }
}

// 第二頁心情放入判定
function handleMoodDrop(card, zone) {
  if (zone.id === 'today-mood-slot') {
    const emoji = card.getAttribute('data-emoji');
    const label = card.getAttribute('data-label');
    state.selectedMoodData = { emoji, label };

    zone.innerHTML = `<span>${todayInfo.day}日</span><span>${emoji}</span>`;
    zone.classList.add('filled-mood');
    notifyFeedback(`感受到了！今天的心情是「${label}」！`, 'success');

    setTimeout(() => {
      showFinalSuccessModal();
    }, 700);
  } else {
    notifyFeedback('欣賞你努力、再試一次', 'try-again');
  }
}

// 彈出最終正向獎勵
function showFinalSuccessModal() {
  const msg = `你專心完成了 ${todayInfo.year}年${todayInfo.month}月${todayInfo.day}日 ${todayInfo.weekday} 的學習，並記錄了${state.selectedMoodData.label}的心情！`;
  document.getElementById('celebrate-message').textContent = msg;
  modalCelebrate.classList.remove('hidden');
}

// 刷新並重設狀態
function resetGameEngine() {
  todayInfo = getTodaySystemInfo();
  state = {
    dateMatched: { year: false, month: false, day: false, weekday: false },
    selectedItemId: null,
    selectedMoodData: null
  };

  document.querySelectorAll('.drop-target').forEach(z => {
    z.classList.remove('filled', 'slot-flash');
    z.textContent = '拖到這裡';
  });

  pageDate.classList.remove('hidden');
  pageMood.classList.add('hidden');
  sentencePanel.classList.add('hidden');
  modalCelebrate.classList.add('hidden');

  viewTitle.textContent = '認識今天：日曆小管家';
  notifyFeedback('請把卡片放進日曆裡！');

  // 根據當前模式切換色彩輔助類別
  if (currentMode === 'easy') {
    appWrapper.classList.add('color-easy');
  } else {
    appWrapper.classList.remove('color-easy');
  }

  renderCalendarPlate('p1-month-grid');
  renderDateDeck();
}

// 難度按鈕切換
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

btnPlayAgain.addEventListener('click', resetGameEngine);

// 程式啟動初始化
appWrapper.classList.add('color-easy');
renderCalendarPlate('p1-month-grid');
renderDateDeck();
setupDropTargetClicks();
bindReadingSentenceClicks();
