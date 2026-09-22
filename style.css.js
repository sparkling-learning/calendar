/**
 * SEN 幼兒教學小遊戲：日曆小管家 (進階版修正)
 * 核心功能：跨裝置拖曳、動態日曆、正向教育回饋
 */

// --- 遊戲數據設定 (教學主題：認識今天) ---
const TARGET_DATE = {
    year: '2026年',
    month: '9月',
    day: '15日',
    weekday: '星期二'
};

// 待選卡片 (包含正確與干擾項)
const CARD_OPTIONS = [
    { id: 'c1', type: 'year', text: '2026年', isCorrect: true },
    { id: 'c2', type: 'year', text: '2025年', isCorrect: false },
    { id: 'c3', type: 'month', text: '9月', isCorrect: true },
    { id: 'c4', type: 'month', text: '5月', isCorrect: false },
    { id: 'c5', type: 'day', text: '15日', isCorrect: true },
    { id: 'c6', type: 'day', text: '28日', isCorrect: false },
    { id: 'c7', type: 'weekday', text: '星期二', isCorrect: true },
    { id: 'c8', type: 'weekday', text: '星期一', isCorrect: false }
];

// 遊戲狀態
let gameState = {
    matched: { year: false, month: false, day: false, weekday: false },
    isComplete: false
};

// --- DOM 元素引用 ---
const feedbackBanner = document.getElementById('feedback-banner');
const cardsDeck = document.getElementById('cards-deck');
const modalSuccess = document.getElementById('modal-success');
const btnRestart = document.getElementById('btn-restart');
const miniCalGrid = document.getElementById('mini-cal-grid');
const miniCalTitle = document.getElementById('mini-cal-title');

// --- 初始化遊戲 ---
function initGame() {
    gameState = { matched: { year: false, month: false, day: false, weekday: false }, isComplete: false };
    resetUI();
    renderMiniCalendar();
    shuffleAndRenderCards();
}

// 重新開始
btnRestart.addEventListener('click', initGame);

// --- 核心邏輯：動態日曆表底板 (保持更新跳轉) ---
// 此處模擬一個 2026 年 9 月的月曆
function renderMiniCalendar() {
    miniCalTitle.textContent = `2026 年 9 月份日曆`;
    miniCalGrid.innerHTML = ''; // 清空

    // 星期一到日頭部
    const daysHeader = ['一', '二', '三', '四', '五', '六', '日'];
    daysHeader.forEach(d => {
        const el = document.createElement('div');
        el.className = 'mini-cal-cell';
        el.style.fontWeight = 'bold';
        el.textContent = d;
        miniCalGrid.appendChild(el);
    });

    // 2026年9月1日是星期二 (空白填補)
    for (let i = 0; i < 1; i++) {
        const blank = document.createElement('div');
        blank.className = 'mini-cal-cell';
        miniCalGrid.appendChild(blank);
    }

    // 9月有30天
    for (let day = 1; day <= 30; day++) {
        const cell = document.createElement('div');
        cell.className = 'mini-cal-cell';
        cell.textContent = day;
        // 如果配對到了15日，則在底板高亮它
        if (day === 15 && gameState.matched.day) {
            cell.classList.add('highlight');
        }
        miniCalGrid.appendChild(cell);
    }
}

// --- 核心邏輯：生成與打亂卡片 ---
function shuffleAndRenderCards() {
    cardsDeck.innerHTML = '';
    const shuffledOptions = [...CARD_OPTIONS].sort(() => Math.random() - 0.5);

    shuffledOptions.forEach(data => {
        const card = document.createElement('div');
        card.className = 'draggable-card';
        card.id = data.id;
        card.textContent = data.text;
        card.setAttribute('data-type', data.type);
        card.setAttribute('data-correct', data.isCorrect);

        // 核心：添加觸控與滑鼠拖曳監聽
        addDragListeners(card);
        cardsDeck.appendChild(card);
    });
}

// --- 核心邏輯：跨裝置拖曳 (Drag & Drop) ---
// 整合 Mobile Touch 與 PC Mouse 事件

let draggedCardId = null;

function addDragListeners(card) {
    // 1. Mobile Touch 事件 (防誤觸處理)
    card.addEventListener('touchstart', (e) => {
        handleDragStart(e, card);
    });

    card.addEventListener('touchmove', (e) => {
        handleDragMove(e, card);
    });

    card.addEventListener('touchend', (e) => {
        handleDragEnd(e, card);
    });

    // 2. PC Mouse 事件
    card.addEventListener('mousedown', (e) => {
        handleDragStart(e, card);
    });

    // Mouse move 和 up 需要在 window 上監聽以利流暢度
}

// 共通的開始拖曳處理
function handleDragStart(e, card) {
    // 如果已經配對成功，則不能再拖曳
    if (gameState.matched[card.getAttribute('data-type')]) return;

    draggedCardId = card.id;
    card.classList.add('dragging');
    updateFeedback('拖曳到日曆中的目標空格吧！');

    // 如果是滑鼠事件，則註冊後續監聽
    if (e.type === 'mousedown') {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
}

// 滑鼠/觸控移動的處理 (實作移動效果)
function handleDragMove(e, card) {
    if (!draggedCardId) return;
    if (e.cancelable) e.preventDefault(); // 阻止頁面滾動

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // 將卡片位置設為固定並隨手指移動
    card.style.position = 'fixed';
    card.style.left = `${clientX - card.offsetWidth / 2}px`;
    card.style.top = `${clientY - card.offsetHeight / 2}px`;
    card.style.zIndex = '100';

    // 視覺提示：高亮目標 Drop Zone
    checkPotentialDropZone(clientX, clientY, card);
}

// 分開處理滑鼠移動 (因為需要解綁)
function handleMouseMove(e) {
    const card = document.getElementById(draggedCardId);
    if (card) handleDragMove(e, card);
}

// 拖曳結束：判定與回饋
function handleDragEnd(e, card) {
    if (!draggedCardId) return;

    card.classList.remove('dragging');
    card.style.position = ''; card.style.left = ''; card.style.top = ''; card.style.zIndex = '';

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    // 清除潛在 Drop Zone 的高亮
    document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));

    // 執行 Drop 判定
    const targetZone = document.elementFromPoint(clientX, clientY);
    if (targetZone && targetZone.closest('.drop-zone')) {
        handleDrop(targetZone.closest('.drop-zone'), card);
    } else {
        // 沒有丟到目標區，返回 (不計錯誤)
        updateFeedback('把正確的卡片放入空格裡！');
    }

    draggedCardId = null;

    // 如果是滑鼠，則解綁 window 監聽
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
}

// 分開處理滑鼠放開
function handleMouseUp(e) {
    const card = document.getElementById(draggedCardId);
    if (card) handleDragEnd(e, card);
}

// 在移動中動態檢查目標區 (SEN 用視覺提示)
function checkPotentialDropZone(x, y, card) {
    const cardType = card.getAttribute('data-type');
    const zones = document.querySelectorAll('.drop-zone');

    zones.forEach(zone => {
        zone.classList.remove('drag-over');
        if (zone.getAttribute('data-type') === cardType && !gameState.matched[cardType]) {
            const rect = zone.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                zone.classList.add('drag-over');
            }
        }
    });
}

// --- 核心邏輯：Drop 判定與回饋 (正向教育用詞) ---
function handleDrop(zone, card) {
    const zoneType = zone.getAttribute('data-type');
    const cardType = card.getAttribute('data-type');
    const isCorrect = card.getAttribute('data-correct') === 'true';

    // 判斷 1：類型不匹配
    if (zoneType !== cardType) {
        updateFeedback('欣賞你努力、再試一次', 'try-again');
        return;
    }

    // 判斷 2：類型匹配但卡片內容錯誤 (干擾項)
    if (!isCorrect) {
        updateFeedback('欣賞你努力、再試一次', 'try-again');
        return;
    }

    // 判斷 3：正確配對！
    zone.textContent = card.textContent;
    zone.classList.add('matched');
    card.classList.add('hidden'); // 隱藏卡片

    gameState.matched[zoneType] = true;
    updateFeedback('好棒的觀察！你填對了這個空格！', 'success-step');

    // 如果日期正確，則更新底部月曆底板的高亮
    if (zoneType === 'day') renderMiniCalendar();

    checkGameCompletion();
}

// --- 正向教育回饋邏輯 ---
function updateFeedback(text, type = 'normal') {
    feedbackBanner.textContent = text;
    feedbackBanner.className = 'feedback-banner';

    if (type === 'try-again') {
        feedbackBanner.classList.add('try-again');
    } else if (type === 'success-step') {
        feedbackBanner.classList.add('success-step');
    }
}

// 完成整個遊戲的最終讚賞
function checkGameCompletion() {
    const allMatched = Object.values(gameState.matched).every(m => m === true);
    if (allMatched && !gameState.isComplete) {
        gameState.isComplete = true;
        updateFeedback('太棒了！今天所有的日曆空格都填對了！', 'success-step');

        setTimeout(() => {
            modalSuccess.classList.remove('hidden');
        }, 1000); // 延遲顯示，讓幼兒消化勝利感
    }
}

// 重置 UI 狀態
function resetUI() {
    // 清空 Drop Zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('matched', 'drag-over');
        if (zone.classList.contains('day-zone')) {
            zone.textContent = '拖到這裡';
        } else {
            zone.textContent = '拖到這裡';
        }
    });
    // 隱藏彈窗與重置反饋
    modalSuccess.classList.add('hidden');
    updateFeedback('請選擇卡片放入日曆中！');
}

// --- 啟動遊戲 ---
window.onload = initGame;