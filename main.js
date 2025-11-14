// ---------- Текущее состояние игры ----------

let score = 0;              // очки
let clickPower = 1;         // сколько даёт один клик
let upgradeCost = 20;       // цена улучшения клика

let incomePerSecond = 0;    // пассивный доход / сек
let incomeCost = 50;        // цена покупки +1 к доходу

let currentGoal = 100;      // следующая цель по очкам

// ---------- Элементы интерфейса ----------

const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('click-button');

const clickPowerElement = document.getElementById('click-power');
const upgradeCostElement = document.getElementById('upgrade-cost');
const buyUpgradeButton = document.getElementById('buy-upgrade');

const incomePerSecondElement = document.getElementById('income-per-second');
const incomeCostElement = document.getElementById('income-cost');
const buyIncomeButton = document.getElementById('buy-income');

const goalValueElement = document.getElementById('goal-value');
const goalStatusElement = document.getElementById('goal-status');
const resetButton = document.getElementById('reset-button');

// контейнер для всплывающих +X
const floatingContainer = document.getElementById('floating-points-container');

// ---------- Сохранение / загрузка ----------

function saveState() {
  const state = {
    score,
    clickPower,
    upgradeCost,
    incomePerSecond,
    incomeCost,
    currentGoal
  };
  localStorage.setItem('clickerState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('clickerState');
  if (!saved) return;

  try {
    const state = JSON.parse(saved);
    if (typeof state.score === 'number') score = state.score;
    if (typeof state.clickPower === 'number') clickPower = state.clickPower;
    if (typeof state.upgradeCost === 'number') upgradeCost = state.upgradeCost;
    if (typeof state.incomePerSecond === 'number') incomePerSecond = state.incomePerSecond;
    if (typeof state.incomeCost === 'number') incomeCost = state.incomeCost;
    if (typeof state.currentGoal === 'number') currentGoal = state.currentGoal;
  } catch (e) {
    console.warn('Не удалось загрузить сохранение', e);
  }
}

// ---------- Логика целей ----------

function checkGoal() {
  if (score >= currentGoal) {
    goalStatusElement.textContent =
      `Отлично! Ты достиг цели ${currentGoal} очков. Новая цель уже выше!`;

    // новая цель, например, x2 от прошлой
    currentGoal = Math.floor(currentGoal * 2);
  } else {
    const remaining = currentGoal - score;
    goalStatusElement.textContent =
      `Осталось ещё ${remaining} очков до цели.`;
  }
}

// ---------- Анимации ----------

// пульс счёта при обновлении
function pulseScore() {
  scoreElement.classList.remove('score-pulse');
  // хак, чтобы анимация перезапускалась
  void scoreElement.offsetWidth;
  scoreElement.classList.add('score-pulse');
}

// показываем всплывающее "+X" над кнопкой
function showFloatingPoints(text) {
  if (!floatingContainer) return;

  const el = document.createElement('div');
  el.className = 'floating-points';
  el.textContent = text;

  floatingContainer.appendChild(el);

  // удаляем элемент после окончания анимации
  setTimeout(() => {
    el.remove();
  }, 600);
}

// ---------- Обновление интерфейса ----------

function updateUI() {
  scoreElement.textContent = score;
  clickPowerElement.textContent = clickPower;
  upgradeCostElement.textContent = upgradeCost;

  incomePerSecondElement.textContent = incomePerSecond;
  incomeCostElement.textContent = incomeCost;

  goalValueElement.textContent = currentGoal;

  buyUpgradeButton.disabled = score < upgradeCost;
  buyIncomeButton.disabled = score < incomeCost;

  checkGoal();
  pulseScore();
}

// ---------- Обработчики действий ----------

// Клик по основной кнопке
clickButton.addEventListener('click', () => {
  score += clickPower;
  updateUI();
  saveState();

  showFloatingPoints(`+${clickPower}`);
});

// Покупка улучшения клика
buyUpgradeButton.addEventListener('click', () => {
  if (score < upgradeCost) return;

  score -= upgradeCost;
  clickPower += 1;
  upgradeCost = Math.floor(upgradeCost * 1.8);

  updateUI();
  saveState();
});

// Покупка авто-дохода
buyIncomeButton.addEventListener('click', () => {
  if (score < incomeCost) return;

  score -= incomeCost;
  incomePerSecond += 1;
  incomeCost = Math.floor(incomeCost * 2);

  updateUI();
  saveState();
});

// Сброс прогресса
resetButton.addEventListener('click', () => {
  const confirmReset = confirm('Точно сбросить прогресс? Отменить нельзя!');
  if (!confirmReset) return;

  score = 0;
  clickPower = 1;
  upgradeCost = 20;
  incomePerSecond = 0;
  incomeCost = 50;
  currentGoal = 100;

  saveState();
  updateUI();
});

// ---------- Авто-доход раз в секунду ----------

setInterval(() => {
  if (incomePerSecond > 0) {
    score += incomePerSecond;
    updateUI();
    saveState();
  }
}, 1000);

// ---------- Старт ----------

loadState();
updateUI();
// ---------- Регистрация сервис-воркера для PWA ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}
