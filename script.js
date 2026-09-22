/**
 * SEN 幼兒日期與情緒認知小遊戲
 * 包含：當天動態日期讀取、雙模式難度、朗讀同步閃亮、心情 Emoji 拖曳放置
 */

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 當天真實日期
function fetchTodayInfo() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: WEEKDAY_NAMES[now.getDay()],
    dayOfWeek: now.getDay()
  };
}

let today = fetchTodayInfo();
let currentMode = 'easy'; // 'easy' 或 'hard'

let state = {
  matchedDate: { year: false, month: false, day: false, weekday: false },
  readCompleted: false,
  selectedMood: null,
  selectedItemId: null
};

// DOM 元素
const feedbackBanner = document.getElementById('feedback-banner');
const pageDate = document.getElementById('page-date');
const pageMood = document.getElementById('page-mood');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const dateCardsDeck = document.getElementById('date-cards-deck');
const emojiDeck = document.getElementById('emoji-deck');
const readingBox = document.getElementById('reading-box');
const btnGotoMood = document.getElementById('btn-goto-mood');
const modalSuccess = document.getElementById('modal-success');
const btnRestart = document.getElementById('btn-restart');
const btnModeEasy = document.getElementById('btn-mode-easy');
const btnModeHard = document.getElementById('btn-mode-hard');

// 正向教育回饋提示
function setFeedback(msg, type = 'normal') {
  feedbackBanner.textContent = msg;
  feedbackBanner.className = 'feedback-banner';
  if (type === 'try-again') feedbackBanner.classList.add('try-again');
  if (type === 'success') feedbackBanner.classList.add('success-step');
}

// 產生第一頁日期選項 (初階 4 張 vs 進階 8 張)
function buildDateOptions() {
  const correctItems = [
    { id: 'd-yr', type: 'year', text: `${today.year}年`, isCorrect: true },
    { id: 'd-mo', type: 'month', text: `${today.month}月`, isCorrect: true },
    { id: 'd-dy', type: 'day', text: `${today.day}日`, isCorrect: true },
    { id: 'd-wk', type: 'weekday', text: today.weekday, isCorrect: true }
  ];

  if (currentMode === 'easy') return correctItems;

  const fakeYear = `${today.year - 1}年`;
  const fakeMonth = today.month === 12 ? '1月' : `${today.month + 1}月`;
  const fakeDay = today.day === 1 ? '15日' : `${today.day - 1}日`;
  const fakeWeekday = today.dayOfWeek === 1 ? '星期三' : '星期一';

  const distractors = [
    { id: 'f-yr', type: 'year', text: fakeYear, isCorrect: false },
    { id: 'f-mo', type: 'month', text: fakeMonth, isCorrect: false },
    { id: 'f-dy', type: 'day', text: fakeDay, isCorrect: false },
    { id: 'f-wk', type: 'weekday', text: fakeWeekday, isCorrect: false }
  ];

  return [...correctItems, ...distractors];
}

// 產生第二頁 Emoji 選項 (初階 2 個 vs 進階 4 個)
function buildMoodOptions() {
  if (currentMode === 'easy') {
    return [
      { id: 'm-happy', emoji: '😊', label: '開心' },
      { id: 'm-calm', emoji: '😌', label: '平靜' }
    ];
  }
  return [
    { id: 'm-happy', emoji: '😊', label: '開心' },
    { id: 'm-calm', emoji: '😌', label: '平靜' },
    { id: 'm-sad', emoji: '😢', label: '難過' },
    { id: 'm-angry', emoji: '😡', label: '生氣' }
  ];
}

// 繪製日曆網格（共用核心）
function drawCalendarGrid(containerId, isMoodPage = false) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';

  const headers = ['日', '一', '二', '三', '四', '五', '六'];
  headers.forEach(h => {
    const el = document.createElement('div');
    el.className = 'cal-cell';
    el.style.fontWeight = 'bold';
    el.textContent = h;
    grid.appendChild(el);
  });

  const firstDay = new Date(today.year, today.month - 1, 1).getDay();
  const totalDays = new Date(today.year, today.month, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell';
    grid.appendChild(blank);
  }

  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.textContent = d;

    if (d === today.day) {
      if (!isMoodPage) {
        if (state.matchedDate.day) cell.classList.add('highlight-day');
      } else {
        // 第二頁心情放置格
        cell.id = 'today-mood-target';
        cell.classList.add('today-mood-dropzone');
        cell.setAttribute('data-day', d);
        if (state.selectedMood) {
          cell.innerHTML = `<span>${d}</span> <span>${state.selectedMood}</span>`;
          cell.classList.add('mood-filled');
        } else {
          cell.innerHTML = `<span>${d}日</span><small>放心情</small>`;
        }
      }
    }
    grid.appendChild(cell);
  }
}

// 渲染卡片 (支援觸控拖曳與點擊雙模式)
function renderDateDeck() {
  dateCardsDeck.innerHTML = '';
  const cards = buildDateOptions().sort(() => Math.random() - 0.5);

  cards.forEach(item => {
    const card = document.createElement('div');
    card.className = 'draggable-card';
    card.id = item.id;
    card.textContent = item.text;
    card.setAttribute('data-type', item.type);
    card.setAttribute('data-correct', item.isCorrect);

    attachUniversalEvents(card, (draggedEl, dropZone) => {
      handleDateDrop(draggedEl, dropZone);
    });

    dateCardsDeck.appendChild(card);
  });
}

// 渲染心情卡片
function renderMoodDeck() {
  emojiDeck.innerHTML = '';
  const moods = buildMoodOptions();

  moods.forEach(item => {
    const card = document.createElement('div');
    card.className = 'emoji-card';
    card.id = item.id;
    card.textContent = item.emoji;
    card.title = item.label;

    attachUniversalEvents(card, (draggedEl, dropZone) => {
      handleMoodDrop(draggedEl, dropZone);
    });

    emojiDeck.appendChild(card);
  });
}

// 觸控與滑鼠通用監聽器
function attachUniversalEvents(card, onDropCallback) {
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging = false;

  // 點選模式
  card.addEventListener('click', () => {
    if (isDragging) return;
    document.querySelectorAll('.draggable-card, .emoji-card').forEach(c => c.classList.remove('selected-tap'));
    card.classList.add('selected-tap');
    state.selectedItemId = card.id;
    setFeedback(`選好了「${card.textContent}」，請點擊目標格子放入！`);
  });

  // 觸控拖曳
  card.addEventListener('touchstart', (e) => {
    isDragging = false;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    card.classList.add('dragging');
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartX) > 6 || Math.abs(t.clientY - touchStartY) > 6) {
      isDragging = true;
    }
    card.style.position = 'fixed';
    card.style.left = `${t.clientX - 45}px`;
    card.style.top = `${t.clientY - 25}px`;
    card.style.zIndex = '1000';
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    card.classList.remove('dragging');
    const t = e.changedTouches[0];
    card.style.position = ''; card.style.left = ''; card.style.top = ''; card.style.zIndex = '';

    const targetEl = document.elementFromPoint(t.clientX, t.clientY);
    const dropZone = targetEl ? (targetEl.closest('.drop-zone') || targetEl.closest('.today-mood-dropzone')) : null;

    if (dropZone) {
      onDropCallback(card, dropZone);
    }
    setTimeout(() => { isDragging = false; }, 50);
  });
}

// 監聽第一頁目標槽點擊 (二段式點擊配對)
function bindDateZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('click', () => {
      if (state.selectedItemId) {
        const card = document.getElementById(state.selectedItemId);
        if (card && card.classList.contains('draggable-card')) {
          handleDateDrop(card, zone);
        }
      }
    });
    zone.addEventListener('dragover', (e) => e.preventDefault());
  });
}

// 第一頁日期配對判定
function handleDateDrop(card, zone) {
  const cardType = card.getAttribute('data-type');
  const zoneType = zone.getAttribute('data-type');
  const isCorrect = card.getAttribute('data-correct') === 'true';

  if (cardType === zoneType && isCorrect) {
    zone.textContent = card.textContent;
    zone.classList.add('matched');
    card.classList.add('hidden');
    state.matchedDate[cardType] = true;
    state.selectedItemId = null;

    setFeedback(`好棒的觀察！正確放入「${card.textContent}」！`, 'success');
    drawCalendarGrid('p1-cal-grid');
    updateReadingSection();
  } else {
    setFeedback('欣賞你努力、再試一次', 'try-again');
    if (state.selectedItemId) {
      card.classList.remove('selected-tap');
      state.selectedItemId = null;
    }
  }
}

// 更新第一頁朗讀句子
function updateReadingSection() {
  const allMatched = Object.values(state.matchedDate).every(Boolean);
  if (allMatched) {
    readingBox.classList.remove('hidden');
    document.getElementById('word-year').textContent = `${today.year}年`;
    document.getElementById('word-month').textContent = `${today.month}月`;
    document.getElementById('word-day').textContent = `${today.day}日`;
    document.getElementById('word-weekday').textContent = today.weekday;
    btnGotoMood.classList.remove('hidden');
    setFeedback('做得好！請點擊字詞一起朗讀，然後點擊下一頁！', 'success');
  }
}

// 句子字詞點擊 -> 對應月曆框同步發光閃爍
function setupReadingFlash() {
  document.querySelectorAll('.word-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetType = btn.getAttribute('data-target');
      const targetBox = document.getElementById(`box-${targetType}`);
      if (targetBox) {
        document.querySelectorAll('.slot-box').forEach(b => b.classList.remove('flash-highlight'));
        targetBox.classList.add('flash-highlight');
        setTimeout(() => {
          targetBox.classList.remove('flash-highlight');
        }, 1800);
      }
    });
  });
}

// 切換至第二頁（今天心情）
btnGotoMood.addEventListener('click', () => {
  pageDate.classList.add('hidden');
  pageMood.classList.remove('hidden');
  pageTitle.textContent = '💖 今天的心情：日曆小管家';
  pageSubtitle.textContent = '選一個符合今天心情的 EMOJI，拖進今天的月曆格子吧！';
  setFeedback('今天是個怎樣的日子呢？把心情放進去吧！');

  drawCalendarGrid('p2-cal-grid', true);
  renderMoodDeck();
  bindMoodZoneClick();
});

// 第二頁目標槽點擊監聽
function bindMoodZoneClick() {
  const moodZone = document.getElementById('today-mood-target');
  if (moodZone) {
    moodZone.addEventListener('click', () => {
      if (state.selectedItemId) {
        const card = document.getElementById(state.selectedItemId);
        if (card && card.classList.contains('emoji-card')) {
          handleMoodDrop(card, moodZone);
        }
      }
    });
  }
}

// 第二頁心情放入判定
function handleMoodDrop(card, zone) {
  if (zone.id === 'today-mood-target') {
    state.selectedMood = card.textContent;
    zone.innerHTML = `<span>${today.day}日</span><span style="font-size:1.6rem">${state.selectedMood}</span>`;
    zone.classList.add('mood-filled');
    setFeedback(`太棒了！記錄下了今天的心情：${card.title}！`, 'success');

    setTimeout(() => {
      showFinalSuccess();
    }, 800);
  } else {
    setFeedback('欣賞你努力、再試一次', 'try-again');
  }
}

// 最終完成彈窗
function showFinalSuccess() {
  document.getElementById('modal-desc').textContent = 
    `你順利完成了 ${today.year}年${today.month}月${today.day}日 ${today.weekday} 的日曆，並記錄了美好的心情！`;
  modalSuccess.classList.remove('hidden');
}

// 重置與再玩一次
function resetGame() {
  today = fetchTodayInfo();
  state = {
    matchedDate: { year: false, month: false, day: false, weekday: false },
    readCompleted: false,
    selectedMood: null,
    selectedItemId: null
  };

  document.querySelectorAll('.drop-zone').forEach(z => {
    z.classList.remove('matched');
    z.textContent = '拖到這裡';
  });

  pageDate.classList.remove('hidden');
  pageMood.classList.add('hidden');
  readingBox.classList.add('hidden');
  btnGotoMood.classList.add('hidden');
  modalSuccess.classList.add('hidden');

  pageTitle.textContent = '📅 認識今天：日曆小管家';
  pageSubtitle.textContent = '把正確的「年份、月份、日期、星期」放進日曆裡吧！';
  setFeedback('請選擇卡片放入日曆中！');

  drawCalendarGrid('p1-cal-grid');
  renderDateDeck();
}

// 難度切換事件
btnModeEasy.addEventListener('click', () => {
  currentMode = 'easy';
  btnModeEasy.classList.add('active');
  btnModeHard.classList.remove('active');
  resetGame();
});

btnModeHard.addEventListener('click', () => {
  currentMode = 'hard';
  btnModeHard.classList.add('active');
  btnModeEasy.classList.remove('active');
  resetGame();
});

btnRestart.addEventListener('click', resetGame);

// 遊戲開局初始化
drawCalendarGrid('p1-cal-grid');
renderDateDeck();
bindDateZones();
setupReadingFlash();
