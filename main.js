// ---------- Текущее состояние игры ----------

// энергия
let score = 0;

// уровни улучшений
let clickLevel = 0;   // сколько раз улучшали клик
let incomeLevel = 0;  // сколько генераторов авто-дохода куплено

// цели
let currentGoal = 100;

// ранги (престиж)
let prestigeLevel = 0;      // сколько раз повышали ранг

// криты
const CRIT_CHANCE = 0.2;    // 20% шанс
const CRIT_MULTIPLIER = 5;  // x5 за крит

// ---------- Экономика ----------

// формулы цены: base * growth^level
const BASE_CLICK_COST = 20;
const CLICK_COST_GROWTH = 1.25;  // ~ +25% за уровень

const BASE_INCOME_COST = 50;
const INCOME_COST_GROWTH = 1.35; // ~ +35% за уровень

// ранги
const PRESTIGE_BASE_REQUIREMENT = 100000; // первая «перерождение» после 100к
const PRESTIGE_REQ_GROWTH = 5;            // каждый следующий ранг ×5
const PRESTIGE_PER_LEVEL_BONUS = 0.5;     // каждый ранг +50% ко всему доходу

// производные значения (обновляются из уровней)
let clickPower = 1;          // сила клика
let incomePerSecond = 0;     // авто-доход
let prestigeMultiplier = 1;  // множитель дохода от рангов
let upgradeCost = BASE_CLICK_COST;
let incomeCost = BASE_INCOME_COST;

// ---------- DOM-элементы ----------

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

const floatingContainer = document.getElementById('floating-points-container');

const prestigeLevelElement = document.getElementById('prestige-level');
const prestigeMultiplierElement = document.getElementById('prestige-multiplier');
const prestigeButton = document.getElementById('prestige-button');

// ---------- Вспомогательные функции экономики ----------

function getClickPowerFromLevel() {
  return 1 + clickLevel;
}

function getIncomePerSecondFromLevel() {
  return incomeLevel;
}

function getPrestigeMultiplierFromLevel() {
  return 1 + prestigeLevel * PRESTIGE_PER_LEVEL_BONUS;
}

function getClickCostFromLevel() {
  return Math.floor(BASE_CLICK_COST * Math.pow(CLICK_COST_GROWTH, clickLevel));
}

function getIncomeCostFromLevel() {
  return Math.floor(BASE_INCOME_COST * Math.pow(INCOME_COST_GROWTH, incomeLevel));
}

function getPrestigeRequirement() {
  return Math.floor(
    PRESTIGE_BASE_REQUIREMENT * Math.pow(PRESTIGE_REQ_GROWTH, prestigeLevel)
  );
}

// пересчитать все производные значения из уровней
function recomputeDerived() {
  clickPower = getClickPowerFromLevel();
  incomePerSecond = getIncomePerSecondFromLevel();
  prestigeMultiplier = getPrestigeMultiplierFromLevel();
  upgradeCost = getClickCostFromLevel();
  incomeCost = getIncomeCostFromLevel();
}

// ---------- Сохранение / загрузка ----------

function saveState() {
  const state = {
    score,
    clickLevel,
    incomeLevel,
    currentGoal,
    prestigeLevel
  };
  localStorage.setItem('clickerState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('clickerState');
  if (!saved) {
    recomputeDerived();
    return;
  }

  try {
    const state = JSON.parse(saved);

    if (typeof state.score === 'number') score = state.score;
    if (typeof state.currentGoal === 'number') currentGoal = state.currentGoal;

    if (typeof state.clickLevel === 'number') {
      clickLevel = state.clickLevel;
    }
    if (typeof state.incomeLevel === 'number') {
      incomeLevel = state.incomeLevel;
    }
    if (typeof state.prestigeLevel === 'number') {
      prestigeLevel = state.prestigeLevel;
    }
  } catch (e) {
    console.warn('Не удалось загрузить сохранение', e);
  }

  recomputeDerived();
}

// ---------- Цели ----------

function checkGoal() {
  if (!goalStatusElement || !goalValueElement) return;

  goalValueElement.textContent = currentGoal;

  if (score >= currentGoal) {
    goalStatusElement.textContent =
      `Отлично! Ты достиг цели ${currentGoal}. Новая цель уже выше!`;
    currentGoal = Math.floor(currentGoal * 2);
  } else {
    const remaining = currentGoal - score;
    goalStatusElement.textContent =
      `Осталось ещё ${remaining} до цели.`;
  }
}

// ---------- Анимации ----------

function pulseScore() {
  if (!scoreElement) return;
  scoreElement.classList.remove('score-pulse');
  // перезапуск анимации
  void scoreElement.offsetWidth;
  scoreElement.classList.add('score-pulse');
}

function showFloatingPoints(text, isCrit = false) {
  if (!floatingContainer) return;

  const el = document.createElement('div');
  el.className = 'floating-points';
  if (isCrit) {
    el.classList.add('crit');
  }
  el.textContent = text;

  floatingContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 600);
}

// ---------- Обновление интерфейса ----------

function updateUI() {
  if (scoreElement) scoreElement.textContent = Math.floor(score);
  if (clickPowerElement) clickPowerElement.textContent = clickPower;
  if (upgradeCostElement) upgradeCostElement.textContent = upgradeCost;

  if (incomePerSecondElement) incomePerSecondElement.textContent = incomePerSecond;
  if (incomeCostElement) incomeCostElement.textContent = incomeCost;

  if (buyUpgradeButton) buyUpgradeButton.disabled = score < upgradeCost;
  if (buyIncomeButton) buyIncomeButton.disabled = score < incomeCost;

  // ранги
  const req = getPrestigeRequirement();
  if (prestigeLevelElement) {
    prestigeLevelElement.textContent = prestigeLevel;
  }
  if (prestigeMultiplierElement) {
    prestigeMultiplierElement.textContent = prestigeMultiplier.toFixed(1);
  }
  if (prestigeButton) {
    if (score >= req) {
      prestigeButton.disabled = false;
      prestigeButton.textContent =
        `Перейти в ранг ${prestigeLevel + 1} (нужно ${req.toLocaleString('ru-RU')} энергии)`;
    } else {
      prestigeButton.disabled = true;
      prestigeButton.textContent =
        `Для ранга ${prestigeLevel + 1} нужно ${req.toLocaleString('ru-RU')} энергии`;
    }
  }

  checkGoal();
  pulseScore();
}

// ---------- Обработчики ----------

// клик по основной кнопке (с критами и ранговым множителем)
if (clickButton) {
  clickButton.addEventListener('click', () => {
    const isCrit = Math.random() < CRIT_CHANCE;

    let gain = clickPower;
    if (isCrit) {
      gain *= CRIT_MULTIPLIER;
      clickButton.classList.add('crit-click');
      setTimeout(() => {
        clickButton.classList.remove('crit-click');
      }, 120);
    }
    gain *= prestigeMultiplier;

    score += gain;
    updateUI();
    saveState();

    if (isCrit) {
      showFloatingPoints(`+${Math.floor(gain)} CRIT!`, true);
    } else {
      showFloatingPoints(`+${Math.floor(gain)}`);
    }
  });
}

// улучшение клика
if (buyUpgradeButton) {
  buyUpgradeButton.addEventListener('click', () => {
    if (score < upgradeCost) return;

    score -= upgradeCost;
    clickLevel += 1;

    recomputeDerived();
    updateUI();
    saveState();
  });
}

// покупка авто-дохода
if (buyIncomeButton) {
  buyIncomeButton.addEventListener('click', () => {
    if (score < incomeCost) return;

    score -= incomeCost;
    incomeLevel += 1;

    recomputeDerived();
    updateUI();
    saveState();
  });
}

// обычный сброс прогресса (без смены ранга)
if (resetButton) {
  resetButton.addEventListener('click', () => {
    const confirmReset = confirm('Точно сбросить прогресс без повышения ранга?');
    if (!confirmReset) return;

    score = 0;
    clickLevel = 0;
    incomeLevel = 0;
    currentGoal = 100;

    recomputeDerived();
    saveState();
    updateUI();
  });
}

// переход в новый ранг (престиж)
if (prestigeButton) {
  prestigeButton.addEventListener('click', () => {
    const requirement = getPrestigeRequirement();
    if (score < requirement) return;

    const ok = confirm(
      `Перейти в ранг ${prestigeLevel + 1}? Прогресс сбросится, но доход увеличится навсегда.`
    );
    if (!ok) return;

    prestigeLevel += 1;

    // полный сброс прогресса
    score = 0;
    clickLevel = 0;
    incomeLevel = 0;
    currentGoal = 100;

    recomputeDerived();
    saveState();
    updateUI();
  });
}

// ---------- Авто-доход раз в секунду ----------

setInterval(() => {
  if (incomePerSecond > 0) {
    const gain = incomePerSecond * prestigeMultiplier;
    score += gain;
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
