const SAVE_KEY = 'energyClickerBig_v1';

// ---------- Состояние игры ----------

let gameStarted = false;

// энергия
let score = 0;
let totalEnergyEarned = 0;

// уровни улучшений и цели
let clickLevel = 0;
let currentGoal = 100;

// ранги (престиж)
let prestigeLevel = 0;

// генераторы
const generatorTypes = [
  { id: 'solar',   name: 'Солнечные панели', baseCost: 50,   costGrowth: 1.25, baseIncome: 1 },
  { id: 'farm',    name: 'Эко-ферма',        baseCost: 300,  costGrowth: 1.3,  baseIncome: 5 },
  { id: 'reactor', name: 'Реактор',          baseCost: 2000, costGrowth: 1.4,  baseIncome: 30 },
  { id: 'orbital', name: 'Орбитальная',      baseCost: 15000,costGrowth: 1.5,  baseIncome: 150 }
];

let generators = generatorTypes.map(() => ({ level: 0 }));

// экономика клика
const BASE_CLICK_COST = 20;
const CLICK_COST_GROWTH = 1.25;

// ранги
const PRESTIGE_BASE_REQUIREMENT = 100000;
const PRESTIGE_REQ_GROWTH = 5;
const PRESTIGE_PER_LEVEL_BONUS = 0.5; // +50% дохода за ранг

// криты
const CRIT_BASE_CHANCE = 0.2;
const CRIT_MULTIPLIER = 5;
let critsEnabled = true;

// исследования
const researchDefs = [
  { id: 'click', maxLevel: 3, baseCost: 500,  costGrowth: 3 },
  { id: 'solar', maxLevel: 3, baseCost: 800,  costGrowth: 3 },
  { id: 'gen',   maxLevel: 5, baseCost: 1200, costGrowth: 3 },
  { id: 'crit',  maxLevel: 3, baseCost: 1500, costGrowth: 3 }
];
let researchLevels = new Array(researchDefs.length).fill(0);

// достижения
const achievementIds = ['energy-1k', 'energy-100k', 'solar-10', 'gen-50', 'prestige-1'];
let unlockedAchievements = {};

// производные значения
let clickPower = 1;
let incomePerSecond = 0;        // базовый доход от генераторов (до ранга)
let prestigeMultiplier = 1;
let upgradeCost = BASE_CLICK_COST;

// производные от исследований
let researchClickMultiplier = 1;
let researchSolarMultiplier = 1;
let researchGlobalGenMultiplier = 1;
let researchCritBonusChance = 0;
let effectiveCritChance = CRIT_BASE_CHANCE;

// ---------- DOM ----------

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

// настройки
const settingCritsCheckbox = document.getElementById('setting-crits');
const btnExportSave = document.getElementById('btn-export-save');
const btnImportSave = document.getElementById('btn-import-save');
const btnHardReset = document.getElementById('btn-hard-reset');

// навигация
const navButtons = document.querySelectorAll('.nav-button');
const screens = {
  station: document.getElementById('screen-station'),
  research: document.getElementById('screen-research'),
  achievements: document.getElementById('screen-achievements'),
  settings: document.getElementById('screen-settings')
};

// генераторы DOM
const generatorDOM = {
  solar: {
    levelEl: document.getElementById('gen-solar-level'),
    costEl: document.getElementById('gen-solar-cost'),
    buyEl: document.getElementById('gen-solar-buy')
  },
  farm: {
    levelEl: document.getElementById('gen-farm-level'),
    costEl: document.getElementById('gen-farm-cost'),
    buyEl: document.getElementById('gen-farm-buy')
  },
  reactor: {
    levelEl: document.getElementById('gen-reactor-level'),
    costEl: document.getElementById('gen-reactor-cost'),
    buyEl: document.getElementById('gen-reactor-buy')
  },
  orbital: {
    levelEl: document.getElementById('gen-orbital-level'),
    costEl: document.getElementById('gen-orbital-cost'),
    buyEl: document.getElementById('gen-orbital-buy')
  }
};

// исследования DOM
const researchDOM = {};
researchDefs.forEach(def => {
  researchDOM[def.id] = {
    levelEl: document.getElementById(`res-${def.id}-level`),
    costEl: document.getElementById(`res-${def.id}-cost`),
    buyEl: document.getElementById(`res-${def.id}-buy`)
  };
});

// ---------- Навигация по экранам ----------

function switchScreen(name) {
  Object.keys(screens).forEach(key => {
    const el = screens[key];
    if (!el) return;
    if (key === name) {
      el.classList.add('screen-active');
    } else {
      el.classList.remove('screen-active');
    }
  });

  navButtons.forEach(btn => {
    if (btn.dataset.screen === name) {
      btn.classList.add('nav-button-active');
    } else {
      btn.classList.remove('nav-button-active');
    }
  });
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    switchScreen(btn.dataset.screen);
  });
});

// ---------- Экономика ----------

function getClickCostFromLevel() {
  return Math.floor(BASE_CLICK_COST * Math.pow(CLICK_COST_GROWTH, clickLevel));
}

function getGeneratorCost(index) {
  const type = generatorTypes[index];
  const level = generators[index].level;
  return Math.floor(type.baseCost * Math.pow(type.costGrowth, level));
}

function getPrestigeRequirement() {
  return Math.floor(
    PRESTIGE_BASE_REQUIREMENT * Math.pow(PRESTIGE_REQ_GROWTH, prestigeLevel)
  );
}

function getResearchCost(index) {
  const def = researchDefs[index];
  const level = researchLevels[index] || 0;
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, level));
}

function recomputeResearchDerived() {
  researchClickMultiplier = 1 + (researchLevels[0] || 0) * 0.25;
  researchSolarMultiplier = 1 + (researchLevels[1] || 0) * 0.2;
  researchGlobalGenMultiplier = 1 + (researchLevels[2] || 0) * 0.1;
  researchCritBonusChance = (researchLevels[3] || 0) * 0.05;
}

function recomputeDerived() {
  recomputeResearchDerived();

  prestigeMultiplier = 1 + prestigeLevel * PRESTIGE_PER_LEVEL_BONUS;

  clickPower = (1 + clickLevel) * researchClickMultiplier;

  // доход от генераторов с учётом исследований
  let baseIncome = 0;
  generatorTypes.forEach((type, index) => {
    const level = generators[index].level;
    if (!level) return;

    let mult = researchGlobalGenMultiplier;
    if (type.id === 'solar') {
      mult *= researchSolarMultiplier;
    }
    baseIncome += type.baseIncome * level * mult;
  });
  incomePerSecond = baseIncome;

  upgradeCost = getClickCostFromLevel();

  effectiveCritChance = critsEnabled
    ? Math.min(0.9, CRIT_BASE_CHANCE + researchCritBonusChance)
    : 0;
}

// ---------- Сохранение / загрузка ----------

function buildStateObject() {
  return {
    version: 1,
    score,
    totalEnergyEarned,
    clickLevel,
    currentGoal,
    prestigeLevel,
    generatorLevels: generators.map(g => g.level),
    researchLevels: researchLevels.slice(),
    critsEnabled,
    unlockedAchievementsIds: Object.keys(unlockedAchievements).filter(
      id => unlockedAchievements[id]
    )
  };
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildStateObject()));
  } catch (e) {
    console.warn('Не удалось сохранить состояние', e);
  }
}

function applyStateObject(state) {
  if (typeof state.score === 'number') score = state.score;
  if (typeof state.totalEnergyEarned === 'number') totalEnergyEarned = state.totalEnergyEarned;
  if (typeof state.clickLevel === 'number') clickLevel = state.clickLevel;
  if (typeof state.currentGoal === 'number') currentGoal = state.currentGoal;
  if (typeof state.prestigeLevel === 'number') prestigeLevel = state.prestigeLevel;

  if (Array.isArray(state.generatorLevels)) {
    generators = generatorTypes.map((_, index) => ({
      level: state.generatorLevels[index] || 0
    }));
  } else {
    generators = generatorTypes.map(() => ({ level: 0 }));
  }

  if (Array.isArray(state.researchLevels)) {
    researchLevels = researchDefs.map((_, index) => state.researchLevels[index] || 0);
  } else {
    researchLevels = new Array(researchDefs.length).fill(0);
  }

  if (typeof state.critsEnabled === 'boolean') {
    critsEnabled = state.critsEnabled;
  } else {
    critsEnabled = true;
  }

  unlockedAchievements = {};
  if (Array.isArray(state.unlockedAchievementsIds)) {
    state.unlockedAchievementsIds.forEach(id => {
      unlockedAchievements[id] = true;
    });
  }

  recomputeDerived();
}

function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    recomputeDerived();
    return;
  }
  try {
    const state = JSON.parse(raw);
    applyStateObject(state);
  } catch (e) {
    console.warn('Не удалось загрузить сейв', e);
    recomputeDerived();
  }
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

// ---------- Достижения ----------

function updateAchievementsUI() {
  function set(id, unlocked) {
    const container = document.getElementById(`ach-${id}`);
    const statusSpan = document.getElementById(`ach-${id}-status`);
    if (!container || !statusSpan) return;

    if (unlocked) {
      statusSpan.textContent = 'Выполнено';
      container.classList.add('achievement-unlocked');
    } else {
      statusSpan.textContent = 'Не выполнено';
      container.classList.remove('achievement-unlocked');
    }
  }

  achievementIds.forEach(id => set(id, !!unlockedAchievements[id]));
}

function evaluateAchievements() {
  if (totalEnergyEarned >= 1000) unlockedAchievements['energy-1k'] = true;
  if (totalEnergyEarned >= 100000) unlockedAchievements['energy-100k'] = true;

  const solarIndex = generatorTypes.findIndex(t => t.id === 'solar');
  if (solarIndex !== -1 && generators[solarIndex].level >= 10) {
    unlockedAchievements['solar-10'] = true;
  }

  const totalGens = generators.reduce((sum, g) => sum + g.level, 0);
  if (totalGens >= 50) unlockedAchievements['gen-50'] = true;

  if (prestigeLevel >= 1) unlockedAchievements['prestige-1'] = true;

  updateAchievementsUI();
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
  if (clickPowerElement) clickPowerElement.textContent = Math.floor(clickPower);
  if (upgradeCostElement) upgradeCostElement.textContent = upgradeCost;

  // доход в секунду с учётом ранга
  const effectiveIncome = incomePerSecond * prestigeMultiplier;
  if (incomePerSecondElement) {
    incomePerSecondElement.textContent = Math.floor(effectiveIncome);
  }

  if (buyUpgradeButton) buyUpgradeButton.disabled = score < upgradeCost;

  // генераторы
  generatorTypes.forEach((type, index) => {
    const dom = generatorDOM[type.id];
    const level = generators[index].level;
    const cost = getGeneratorCost(index);

    if (dom.levelEl) dom.levelEl.textContent = level;
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

  // исследования
  researchDefs.forEach((def, index) => {
    const dom = researchDOM[def.id];
    const level = researchLevels[index] || 0;
    if (!dom) return;

    if (dom.levelEl) dom.levelEl.textContent = level;

    if (dom.costEl) {
      if (level >= def.maxLevel) {
        dom.costEl.textContent = 'макс';
      } else {
        dom.costEl.textContent = getResearchCost(index);
      }
    }

    if (dom.buyEl) {
      if (level >= def.maxLevel) {
        dom.buyEl.disabled = true;
      } else {
        dom.buyEl.disabled = score < getResearchCost(index);
      }
    }
  });

  checkGoal();
  evaluateAchievements();
  pulseScore();
}

// ---------- Обработчики ----------

// старт игры
if (startButton) {
  startButton.addEventListener('click', () => {
    gameStarted = true;
    if (startScreen) startScreen.style.display = 'none';
  });
}

// клик по основной кнопке
if (clickButton) {
  clickButton.addEventListener('click', () => {
    if (!gameStarted) return;

    const isCrit = Math.random() < effectiveCritChance;

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
    totalEnergyEarned += gain;

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
  const dom = generatorDOM[type.id];
  if (!dom || !dom.buyEl) return;

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

// обычный сброс прогресса (без повышения ранга)
if (resetButton) {
  resetButton.addEventListener('click', () => {
    const confirmReset = confirm('Точно сбросить прогресс без повышения ранга?');
    if (!confirmReset) return;

    score = 0;
    clickLevel = 0;
    currentGoal = 100;
    generators = generatorTypes.map(() => ({ level: 0 }));
    // totalEnergyEarned оставляем — это "за всё время"

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

// исследования
researchDefs.forEach((def, index) => {
  const dom = researchDOM[def.id];
  if (!dom || !dom.buyEl) return;

  dom.buyEl.addEventListener('click', () => {
    if (!gameStarted) return;

    const level = researchLevels[index] || 0;
    if (level >= def.maxLevel) return;

    const cost = getResearchCost(index);
    if (score < cost) return;

    score -= cost;
    researchLevels[index] = level + 1;

    recomputeDerived();
    updateUI();
    saveState();
  });
});

// настройки: криты
if (settingCritsCheckbox) {
  settingCritsCheckbox.addEventListener('change', () => {
    critsEnabled = settingCritsCheckbox.checked;
    recomputeDerived();
    saveState();
    updateUI();
  });
}

// настройки: экспорт сейва
if (btnExportSave) {
  btnExportSave.addEventListener('click', () => {
    const stateStr = JSON.stringify(buildStateObject());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(stateStr).then(
        () => {
          alert('Сейв скопирован в буфер обмена.');
        },
        () => {
          prompt('Не удалось автоматически скопировать. Скопируй текст вручную:', stateStr);
        }
      );
    } else {
      prompt('Скопируй текст сейва:', stateStr);
    }
  });
}

// настройки: импорт сейва
if (btnImportSave) {
  btnImportSave.addEventListener('click', () => {
    const text = prompt('Вставь сюда текст сейва:');
    if (!text) return;
    try {
      const obj = JSON.parse(text);
      applyStateObject(obj);
      saveState();
      if (settingCritsCheckbox) {
        settingCritsCheckbox.checked = critsEnabled;
      }
      updateAchievementsUI();
      updateUI();
      alert('Сейв загружен.');
    } catch (e) {
      alert('Не удалось прочитать сейв. Убедись, что вставил правильный текст.');
    }
  });
}

// настройки: полный сброс
if (btnHardReset) {
  btnHardReset.addEventListener('click', () => {
    const ok = confirm('Полный сброс игры? Будет удалён весь прогресс и настройки.');
    if (!ok) return;

    localStorage.removeItem(SAVE_KEY);

    score = 0;
    totalEnergyEarned = 0;
    clickLevel = 0;
    currentGoal = 100;
    prestigeLevel = 0;
    generators = generatorTypes.map(() => ({ level: 0 }));
    researchLevels = new Array(researchDefs.length).fill(0);
    unlockedAchievements = {};
    critsEnabled = true;

    recomputeDerived();
    if (settingCritsCheckbox) settingCritsCheckbox.checked = true;
    updateAchievementsUI();
    updateUI();
  });
}

// ---------- Авто-доход раз в секунду ----------

setInterval(() => {
  if (!gameStarted) return;

  const gain = incomePerSecond * prestigeMultiplier;
  if (gain > 0) {
    score += gain;
    totalEnergyEarned += gain;
    updateUI();
    saveState();
  }
}, 1000);

// ---------- Старт ----------

loadState();
if (settingCritsCheckbox) {
  settingCritsCheckbox.checked = critsEnabled;
}
updateAchievementsUI();
updateUI();

// Регистрация сервис-воркера для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}
