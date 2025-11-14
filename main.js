// ---------- Состояние игры ----------

// энергия
let score = 0;

// уровни улучшений
let clickLevel = 0;           // улучшения клика
let currentGoal = 100;

// ранги (престиж)
let prestigeLevel = 0;

// генераторы (солнечные панели, ферма, реактор)
const generatorTypes = [
  { id: 'solar',   baseCost: 50,   costGrowth: 1.25, baseIncome: 1 },
  { id: 'farm',    baseCost: 300,  costGrowth: 1.3,  baseIncome: 5 },
  { id: 'reactor', baseCost: 2000, costGrowth: 1.4,  baseIncome: 30 }
];

// уровни генераторов (сколько каждого куплено)
let generators = generatorTypes.map(() => ({ level: 0 }));

// криты
const CRIT_CHANCE = 0.2;      // 20% шанс
const CRIT_MULTIPLIER = 5;    // x5 за крит

// экономика клика
const BASE_CLICK_COST = 20;
const CLICK_COST_GROWTH = 1.25;

// ранги: требования и бонус
const PRESTIGE_BASE_REQUIREMENT = 100000;
const PRESTIGE_REQ_GROWTH = 5;
const PRESTIGE_PER_LEVEL_BONUS = 0.5; // +50% дохода за ранг

// производные значения
let clickPower = 1;
let incomePerSecond = 0;
let prestigeMultiplier = 1;
let upgradeCost = BASE_CLICK_COST;

// стартовый флаг
let gameStarted = false;

// ---------- DOM-элементы ----------

const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('click-button');

const clickPowerElement = document.getElementById('click-power');
const upgradeCostElement = document.getElementById('upgrade-cost');
const buyUpgradeButton = document.getElementById('buy-upgrade');

const incomePerSecondElement = document.getElementById('income-per-second');

const goalValueElement = document.getElementById('goal-value');
const goalStatusElement = document.getElementById('goal-status');
const resetButton = document.getElementById('reset-button');

const floatingContainer = document.getElementById('floating-points-container');

const prestigeLevelElement = document.getElementById('prestige-level');
const prestigeMultiplierElement = document.getElementById('prestige-multiplier');
const prestigeButton = document.getElementById('prestige-button');

// стартовый экран
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

// DOM для генераторов
const generatorDOM = generatorTypes.map(type => ({
  levelEl: document.getElementById(`gen-${type.id}-level`),
  costEl: document.getElementById(`gen-${type.id}-cost`),
  buyEl: document.getElementById(`gen-${type.id}-buy`)
}));

// ---------- Вспомогательные функции экономики ----------

function getClickPowerFromLevel() {
  return 1 + clickLevel;
}

function getClickCostFromLevel() {
  return Math.floor(BASE_CLICK_COST * Math.pow(CLICK_COST_GROWTH, clickLevel));
}

function getGeneratorCost(index) {
  const type = generatorTypes[index];
  const level = generators[index].level;
  return Math.floor(type.baseCost * Math.pow(type.costGrowth, level));
}

function getBaseIncomePerSecond() {
  let total = 0;
  generatorTypes.forEach((type, index) => {
    total += type.baseIncome * generators[index].level;
  });
  return total;
}

function getPrestigeMultiplierFromLevel() {
  return 1 + prestigeLevel * PRESTIGE_PER_LEVEL_BONUS;
}

function getPrestigeRequirement() {
  return Math.floor(
    PRESTIGE_BASE_REQUIREMENT * Math.pow(PRESTIGE_REQ_GROWTH, prestigeLevel)
  );
}

// пересчитать производные значения
function recomputeDerived() {
  clickPower = getClickPowerFromLevel();
  incomePerSecond = getBaseIncomePerSecond();
  prestigeMultiplier = getPrestigeMultiplierFromLevel();
  upgradeCost = getClickCostFromLevel();
}

// ---------- Сохранение / загрузка ----------

function saveState() {
  const state = {
    score,
    clickLevel,
    currentGoal,
    prestigeLevel,
    generatorLevels: generators.map(g => g.level)
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
    if (typeof state.clickLevel === 'number') clickLevel = state.clickLevel;
    if (typeof state.currentGoal === 'number') currentGoal = state.currentGoal;
    if (typeof state.prestigeLevel === 'number') prestigeLevel = state.prestigeLevel;

    if (Array.isArray(state.generatorLevels)) {
      generators = generatorTypes.map((_, index) => ({
        level: state.generatorLevels[index] || 0
      }));
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

  // доход в секунду отображаем уже с учётом ранга
  const effectiveIncome = incomePerSecond * prestigeMultiplier;
  if (incomePerSecondElement) {
    incomePerSecondElement.textContent = Math.floor(effectiveIncome);
  }

  if (buyUpgradeButton) buyUpgradeButton.disabled = score < upgradeCost;

  // генераторы
  generatorTypes.forEach((type, index) => {
    const dom = generatorDOM[index];
    const cost = getGeneratorCost(index);

    if (dom.levelEl) dom.levelEl.textContent = generators[index].level;
    if (dom.costEl) dom.costEl.textContent = cost;
    if (dom.buyEl) dom.buyEl.disabled = score < cost;
  });

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

// старт игры
if (startButton) {
  startButton.addEventListener('click', () => {
    gameStarted = true;
    if (startScreen) {
      startScreen.style.display = 'none';
    }
  });
}

// клик по основной кнопке
if (clickButton) {
  clickButton.addEventListener('click', () => {
    if (!gameStarted) return;

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
    if (!gameStarted) return;
    if (score < upgradeCost) return;

    score -= upgradeCost;
    clickLevel += 1;

    recomputeDerived();
    updateUI();
    saveState();
  });
}

// покупка генераторов
generatorTypes.forEach((type, index) => {
  const dom = generatorDOM[index];
  if (!dom.buyEl) return;

  dom.buyEl.addEventListener('click', () => {
    if (!gameStarted) return;

    const cost = getGeneratorCost(index);
    if (score < cost) return;

    score -= cost;
    generators[index].level += 1;

    recomputeDerived();
    updateUI();
    saveState();
  });
});

// обычный сброс прогресса
if (resetButton) {
  resetButton.addEventListener('click', () => {
    const confirmReset = confirm('Точно сбросить прогресс без повышения ранга?');
    if (!confirmReset) return;

    score = 0;
    clickLevel = 0;
    currentGoal = 100;
    generators = generatorTypes.map(() => ({ level: 0 }));

    recomputeDerived();
    saveState();
    updateUI();
  });
}

// переход в новый ранг (престиж)
if (prestigeButton) {
  prestigeButton.addEventListener('click', () => {
    if (!gameStarted) return;

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
    currentGoal = 100;
    generators = generatorTypes.map(() => ({ level: 0 }));

    recomputeDerived();
    saveState();
    updateUI();
  });
}

// ---------- Авто-доход раз в секунду ----------

setInterval(() => {
  if (!gameStarted) return;

  const gain = incomePerSecond * prestigeMultiplier;
  if (gain > 0) {
    score += gain;
    updateUI();
    saveState();
  }
}, 1000);

// ---------- Старт ----------

loadState();
recomputeDerived();
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
