// === НАВИГАЦИЯ ===
const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
  });
});

// === РЕСУРСЫ ===
let resources = {
  ton: 9999,
  energy: 9999,
  byte: 9999,
  cb: 9999
};

// Загрузка ресурсов из localStorage
if (localStorage.getItem('resources')) {
  resources = JSON.parse(localStorage.getItem('resources'));
}

function updateAllResources() {
  document.getElementById('tonValue').textContent = resources.ton;
  document.getElementById('energyValue').textContent = resources.energy;
  document.getElementById('byteValue').textContent = resources.byte;
  document.getElementById('cbValue').textContent = resources.cb;
  localStorage.setItem('resources', JSON.stringify(resources));
}

updateAllResources();

// === ЭНЕРГИЯ ===
let currentEnergy = parseInt(localStorage.getItem("currentEnergy")) || 0;
let maxEnergy = 1600;
let energyCans = resources.energy;

const drinkButtons = document.querySelectorAll(".brew-btn, .drink-btn, #drinkButtonMarket");
const energyFillBars = document.querySelectorAll(".energy-bar .energy-fill");
const energyTextBars = document.querySelectorAll(".energy-bar .energy-text");

function updateEnergyUI() {
  // Обновляем цифру банок в топбаре
  resources.energy = energyCans;

  const percent = Math.min((currentEnergy / maxEnergy) * 100, 100);

  energyFillBars.forEach(bar => {
    bar.style.width = percent + "%";
  });

  energyTextBars.forEach(text => {
    text.textContent = `⚡ ${currentEnergy} / ${maxEnergy}`;
  });

  updateAllResources();
}

function drinkEnergy() {
  if (energyCans <= 0) {
    alert("❌ У вас больше нет банок энергии");
    return;
  }
  if (currentEnergy >= maxEnergy) {
    alert("⚡ Энергия заполнена!");
    return;
  }

  energyCans -= 1;
  currentEnergy = Math.min(currentEnergy + 10, maxEnergy);
  localStorage.setItem("currentEnergy", currentEnergy);
  updateEnergyUI();
}

drinkButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    drinkEnergy();
    btn.style.transform = "scale(0.9)";
    setTimeout(() => (btn.style.transform = "scale(1)"), 150);
  });
});

updateEnergyUI();

// === СИСТЕМА ИНВЕНТАРЯ (ИСПРАВЛЕННАЯ) ===
const slotsContainer = document.getElementById('slotsContainer');
const buySlotBtn = document.getElementById('buySlotBtn');
const craftModal = document.getElementById('craftModal');
const closeCraft = document.getElementById('closeCraft');
const openCraftBtn = document.getElementById('craftBtn');
const infoModal = document.getElementById('infoModal');
const closeInfo = document.getElementById('closeInfo');
const confirmCraftBtn = document.getElementById('confirmCraft');
const upgradeModal = document.getElementById('upgradeModal');
const upgradeTitle = document.getElementById('upgradeTitle');
const upgradeBody = document.getElementById('upgradeBody');
const closeUpgrade = document.getElementById('closeUpgrade');
const confirmUpgrade = document.getElementById('confirmUpgrade');
const toolModal = document.getElementById('toolModal');
const toolBody = document.getElementById('toolBody');
const closeTool = document.getElementById('closeTool');
const startTool = document.getElementById('startTool');
const upgradeTool = document.getElementById('upgradeTool');
let currentToolIndex = null;

// КОНСТАНТЫ
const maxSlots = 10;
const SLOT_PRICE = 1;
const MAX_TOOL_LEVEL = 3;

// ПЕРЕМЕННЫЕ
let activeSlotIndex = null;
let selectedItem = null;
let selectedLvl = null;
let pendingUpgrade = null;

// Загружаем количество слотов
let slots = parseInt(localStorage.getItem('totalSlots')) || 4;
if (slots > maxSlots) slots = maxSlots;

// Загружаем инвентарь
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
// Если инвентарь короче чем slots, дополняем null
while (inventory.length < slots) {
  inventory.push(null);
}
// Если инвентарь длиннее чем slots, обрезаем
if (inventory.length > slots) {
  inventory = inventory.slice(0, slots);
}

const toolImages = {
  EnergyBar: {
    1: "Ton/EnergyBar 1lvl.png",
    2: "Ton/EnergyBar 2lvl.png",
    3: "Ton/EnergyBar 3lvl.png"
  },
  ByteMachine: {
    1: "Ton/Byte machine 1lvl.png",
    2: "Ton/Byte machine 2lvl.png",
    3: "Ton/Byte machine 3lvl.png"
  },
  CBBank: {
    1: "Ton/CB Bank 1lvl.png",
    2: "Ton/CB Bank 2lvl.png",
    3: "Ton/CB Bank 3lvl.png"
  }
};

// === БАЗА КРАФТА И ПРОИЗВОДСТВА ===
const craftData = {
  EnergyBar: {
    1: { 
      craft: { bytes: 1730, cb: 940 }, 
      service: { bytes: 12, cb: 9, energy: 200 }, 
      exit: { amount: 127, type: "energy", name: "energy bottles" },
      productionTime: 21600000
    },
    2: { 
      craft: { bytes: 3300, cb: 1750 }, 
      service: { bytes: 24, cb: 16, energy: 380 }, 
      exit: { amount: 260, type: "energy", name: "energy bottles" },
      productionTime: 21600000
    },
    3: { 
      craft: { bytes: 6500, cb: 3400 }, 
      service: { bytes: 46, cb: 30, energy: 740 }, 
      exit: { amount: 430, type: "energy", name: "energy bottles" },
      productionTime: 21600000
    }
  },
  ByteMachine: {
    1: { 
      craft: { bytes: 2500, cb: 1300 }, 
      service: { bytes: 16, cb: 5, energy: 280 }, 
      exit: { amount: 75, type: "byte", name: "bytes" },
      productionTime: 21600000
    },
    2: { 
      craft: { bytes: 4800, cb: 2400 }, 
      service: { bytes: 30, cb: 12, energy: 540 }, 
      exit: { amount: 152, type: "byte", name: "bytes" },
      productionTime: 21600000
    },
    3: { 
      craft: { bytes: 9500, cb: 4600 }, 
      service: { bytes: 58, cb: 25, energy: 1030 }, 
      exit: { amount: 305, type: "byte", name: "bytes" },
      productionTime: 21600000
    }
  },
  CBBank: {
    1: { 
      craft: { bytes: 2800, cb: 1500 }, 
      service: { bytes: 32, cb: 17, energy: 300 }, 
      exit: { amount: 72, type: "cb", name: "CB Bucks" },
      productionTime: 21600000
    },
    2: { 
      craft: { bytes: 5600, cb: 2900 }, 
      service: { bytes: 62, cb: 32, energy: 580 }, 
      exit: { amount: 145, type: "cb", name: "CB Bucks" },
      productionTime: 21600000
    },
    3: { 
      craft: { bytes: 11200, cb: 5800 }, 
      service: { bytes: 120, cb: 62, energy: 1050 }, 
      exit: { amount: 292, type: "cb", name: "CB Bucks" },
      productionTime: 21600000
    }
  }
};

// === ДАННЫЕ ДЛЯ УЛУЧШЕНИЙ (ТОЛЬКО +1 УРОВЕНЬ) ===
const upgradeData = {
  EnergyBar: {
    1: { bytes: 1630, cb: 840 },
    2: { bytes: 3200, cb: 1650 }
  },
  ByteMachine: {
    1: { bytes: 2400, cb: 1200 },
    2: { bytes: 4700, cb: 2300 }
  },
  CBBank: {
    1: { bytes: 2700, cb: 1400 },
    2: { bytes: 5500, cb: 2800 }
  }
};

// === ФУНКЦИИ СОХРАНЕНИЯ ===
function saveInventory() {
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('totalSlots', slots.toString());
}

function saveAll() {
  saveInventory();
  updateAllResources();
}

// === ПРОИЗВОДСТВО (6 часов) ===
let productionState = JSON.parse(localStorage.getItem("productionState") || "[]");

function saveProductionState() {
  localStorage.setItem("productionState", JSON.stringify(productionState));
}

function normalizeProductionState() {
  if (!Array.isArray(productionState)) productionState = [];
  while (productionState.length < slots) productionState.push(null);
  if (productionState.length > slots) productionState = productionState.slice(0, slots);
  for (let i = 0; i < productionState.length; i++) {
    const entry = productionState[i];
    if (!inventory[i]) {
      productionState[i] = null;
      continue;
    }
    if (!entry || typeof entry !== "object" || !Number.isFinite(entry.endsAt)) {
      productionState[i] = null;
    }
  }
  saveProductionState();
}

function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hh = String(h);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function isProducing(index, now = Date.now()) {
  const entry = productionState[index];
  return !!entry && Number.isFinite(entry.endsAt) && now < entry.endsAt;
}

function finishProduction(index, options = {}) {
  const { silent = false, updateUI = true } = options;
  const entry = productionState[index];
  const item = inventory[index];
  if (!entry || !item) return;
  const data = craftData[item.name][item.lvl];
  resources[data.exit.type] = (resources[data.exit.type] || 0) + data.exit.amount;
  productionState[index] = null;
  saveProductionState();
  if (updateUI) {
    updateAllResources();
  }
  if (!silent) {
    showProductionNotification(item, data.exit.amount, data.exit.name);
  }
}

function showProductionNotification(item, amount, name) {
  const note = document.createElement("div");
  note.className = "production-notification";
  note.innerHTML = `
    <div class="production-notification-content">
      <div class="production-notification-icon">✅</div>
      <div class="production-notification-text">
        <p>${item.name} ${item.lvl} lvl</p>
        <p>Готово: +${amount} ${name}</p>
      </div>
    </div>
  `;
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 3200);
}

function showToast(message, type = "info") {
  const note = document.createElement("div");
  note.className = "production-notification";
  if (type === "error") {
    note.style.background = "linear-gradient(135deg, #b00020, #ff4d4f)";
  } else if (type === "success") {
    note.style.background = "linear-gradient(135deg, #00b894, #00a8ff)";
  } else {
    note.style.background = "linear-gradient(135deg, #3949ab, #5c6bc0)";
  }
  note.innerHTML = `
    <div class="production-notification-content">
      <div class="production-notification-icon">${type === "error" ? "❌" : "✅"}</div>
      <div class="production-notification-text">
        <p>${message}</p>
      </div>
    </div>
  `;
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 2600);
}

function updateProductionTimers() {
  for (let i = 0; i < productionState.length; i++) {
    const entry = productionState[i];
    if (!entry || !Number.isFinite(entry.endsAt)) continue;
    const remaining = entry.endsAt - Date.now();
    if (remaining <= 0) {
      finishProduction(i);
    }
  }

  document.querySelectorAll(".timer-pill[data-slot]").forEach(node => {
    const index = parseInt(node.dataset.slot);
    if (!Number.isFinite(index)) return;
    if (!isProducing(index)) {
      node.textContent = "";
      node.classList.add("hidden");
      return;
    }
    const entry = productionState[index];
    node.classList.remove("hidden");
    node.textContent = formatTimer(entry.endsAt - Date.now());
  });
}

normalizeProductionState();

// === ОТРИСОВКА СЛОТОВ ===
function renderSlots() {
  normalizeProductionState();
  slotsContainer.innerHTML = "";

  for (let i = 0; i < slots; i++) {
    const slot = document.createElement("div");
    slot.classList.add("slot");
    slot.dataset.index = i;

    if (inventory[i]) {
      const item = inventory[i];
      const img = document.createElement("img");
      img.src = item.img;
      slot.appendChild(img);

      const meta = document.createElement("div");
      meta.className = "slot-meta";

      const lvl = document.createElement("div");
      lvl.className = "slot-pill level-pill";
      lvl.textContent = `${item.lvl} lvl`;
      meta.appendChild(lvl);

      const timer = document.createElement("div");
      timer.className = "slot-pill timer-pill hidden";
      timer.dataset.slot = i;
      meta.appendChild(timer);

      slot.appendChild(meta);

      if (isProducing(i)) {
        slot.classList.add("producing");
        timer.classList.remove("hidden");
        timer.textContent = formatTimer(productionState[i].endsAt - Date.now());
      }
    } else {
      const plus = document.createElement("div");
      plus.classList.add("plus-slot");
      plus.textContent = "+";
      plus.addEventListener("click", () => openCraft(i));
      slot.appendChild(plus);
    }

    slotsContainer.appendChild(slot);
  }

  // Обновляем кнопку покупки слота
  updateBuySlotButton();
}

function maybeFinishOverdue(index, now, options = {}) {
  const entry = productionState[index];
  if (entry && Number.isFinite(entry.endsAt) && entry.endsAt <= now) {
    finishProduction(index, options);
  }
}

function canAutoFillEnergy(required) {
  if (currentEnergy >= required) return true;
  const needed = required - currentEnergy;
  const cansNeeded = Math.ceil(needed / 10);
  return energyCans >= cansNeeded;
}

function applyAutoFillEnergy(required) {
  if (currentEnergy >= required) return true;
  const needed = required - currentEnergy;
  const cansNeeded = Math.ceil(needed / 10);
  if (energyCans < cansNeeded) return false;
  energyCans -= cansNeeded;
  currentEnergy = Math.min(maxEnergy, currentEnergy + cansNeeded * 10);
  resources.energy = energyCans;
  localStorage.setItem("currentEnergy", currentEnergy);
  return currentEnergy >= required;
}

function startProductionAutoAtIndex(index, atTime = Date.now()) {
  if (!Number.isFinite(index)) return false;
  const item = inventory[index];
  if (!item) return false;

  maybeFinishOverdue(index, atTime, { silent: true, updateUI: false });

  if (isProducing(index, atTime)) return false;

  const data = craftData[item.name][item.lvl];
  const service = data.service;

  if (resources.byte < service.bytes || resources.cb < service.cb) {
    return false;
  }

  if (currentEnergy < service.energy) {
    if (!canAutoFillEnergy(service.energy)) return false;
    if (!applyAutoFillEnergy(service.energy)) return false;
  }

  if (currentEnergy < service.energy) return false;

  resources.byte -= service.bytes;
  resources.cb -= service.cb;
  currentEnergy = Math.max(0, currentEnergy - service.energy);
  localStorage.setItem("currentEnergy", currentEnergy);
  resources.energy = energyCans;

  productionState[index] = {
    endsAt: atTime + data.productionTime
  };
  saveProductionState();
  return true;
}

function startProductionAtIndex(index) {
  if (!Number.isFinite(index)) {
    if (Number.isFinite(currentToolIndex)) {
      index = currentToolIndex;
    } else {
      showToast("Сначала выберите инструмент в слоте.", "error");
      return;
    }
  }
  const item = inventory[index];
  if (!item) {
    showToast("В слоте нет инструмента.", "error");
    return;
  }
  const data = craftData[item.name][item.lvl];
  const service = data.service;

  const now = Date.now();
  maybeFinishOverdue(index, now, { silent: true, updateUI: false });

  if (isProducing(index, now)) {
    showToast(`Уже запущено. Осталось: ${formatTimer(productionState[index].endsAt - Date.now())}`, "error");
    return;
  }

  if (resources.byte < service.bytes || resources.cb < service.cb || currentEnergy < service.energy) {
    showToast(
      `Недостаточно ресурсов: нужно ${service.bytes} Bytes, ${service.cb} CB, ${service.energy} Energy`,
      "error"
    );
    return;
  }

  const warnText =
    `Внимание!\n` +
    `Запуск ${item.name} ${item.lvl} lvl на 6 часов.\n` +
    `Будет списано: ${service.bytes} Bytes, ${service.cb} CB, ${service.energy} Energy`;
  let okToStart = true;
  if (typeof window.confirm === "function") {
    try {
      okToStart = confirm(warnText);
    } catch (e) {
      okToStart = true;
    }
  }
  if (!okToStart) {
    showToast("Запуск отменен.", "info");
    return;
  }

  resources.byte -= service.bytes;
  resources.cb -= service.cb;
  currentEnergy = Math.max(0, currentEnergy - service.energy);
  localStorage.setItem("currentEnergy", currentEnergy);
  updateEnergyUI();

  productionState[index] = {
    endsAt: now + data.productionTime
  };
  saveProductionState();
  renderSlots();
  if (toolModal) toolModal.classList.add("hidden");
  showToast(`Запуск: ${item.name} ${item.lvl} lvl`, "success");
}

window.startProductionAtIndex = startProductionAtIndex;

if (startTool && toolModal) {
  startTool.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const index = parseInt(toolModal.dataset.currentIndex || "", 10);
    startProductionAtIndex(index);
  });
}

// Резервный обработчик, если кнопка была пересоздана/не найдена при инициализации
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#startTool");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const modal = document.getElementById("toolModal");
  const index = modal ? parseInt(modal.dataset.currentIndex || "", 10) : NaN;
  startProductionAtIndex(index);
});

// Ловим клик в фазе захвата на случай блокировки всплытия
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#startTool");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const modal = document.getElementById("toolModal");
  const index = modal ? parseInt(modal.dataset.currentIndex || "", 10) : NaN;
  startProductionAtIndex(index);
}, true);

// Делегирование по data-action, если id-обработчики не сработали
document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  if (btn.disabled) return;
  const action = btn.dataset.action;
  const modal = document.getElementById("toolModal");
  const index = modal ? parseInt(modal.dataset.currentIndex || "", 10) : NaN;
  if (action === "start") {
    e.preventDefault();
    startProductionAtIndex(index);
  }
  if (action === "upgrade") {
    e.preventDefault();
    window.__upgradeToolClick && window.__upgradeToolClick();
  }
});

// Inline-fallback handlers for кнопок (на случай блокировки событий)
window.__startToolClick = function () {
  const modal = document.getElementById("toolModal");
  const index = modal ? parseInt(modal.dataset.currentIndex || "", 10) : NaN;
  startProductionAtIndex(index);
};

function setUpgradeButtonState(item) {
  if (!upgradeTool) return;
  const currentLvl = item ? Number(item.lvl) : NaN;
  const nextLvl = Number.isFinite(currentLvl) ? currentLvl + 1 : NaN;
  if (!Number.isFinite(nextLvl) || nextLvl > MAX_TOOL_LEVEL) {
    upgradeTool.textContent = "Max";
    upgradeTool.disabled = true;
    upgradeTool.classList.add("is-max");
    return;
  }
  upgradeTool.textContent = "⤴️ Улучшить";
  upgradeTool.disabled = false;
  upgradeTool.classList.remove("is-max");
}

function openUpgradeModal(index) {
  if (!Number.isFinite(index)) index = currentToolIndex;
  if (!Number.isFinite(index)) {
    showToast("Сначала выберите инструмент в слоте.", "error");
    return;
  }
  const item = inventory[index];
  if (!item) {
    showToast("В слоте нет инструмента.", "error");
    return;
  }
  if (isProducing(index)) {
    showToast("Нельзя улучшать во время производства.", "error");
    return;
  }

  const currentLvl = Number(item.lvl) || 1;
  const nextLvl = currentLvl + 1;
  if (nextLvl > MAX_TOOL_LEVEL) {
    showToast("Достигнут максимальный уровень.", "info");
    return;
  }

  const cost = upgradeData[item.name] ? upgradeData[item.name][currentLvl] : null;
  if (!cost) {
    showToast("Нет данных для улучшения.", "error");
    return;
  }

  pendingUpgrade = {
    index,
    from: currentLvl,
    to: nextLvl,
    cost,
    name: item.name
  };

  if (upgradeTitle) {
    upgradeTitle.textContent = `${item.name} ${currentLvl} lvl → ${nextLvl} lvl`;
  }

  if (upgradeBody) {
    upgradeBody.innerHTML = `
      <p><b>${item.name} ${currentLvl} lvl → ${nextLvl} lvl</b></p>
      <p><b>Upgrade:</b> ${cost.bytes} Bytes, ${cost.cb} CB</p>
    `;
  }

  if (upgradeModal) upgradeModal.classList.remove("hidden");
  if (toolModal) toolModal.classList.add("hidden");
}

window.__upgradeToolClick = function () {
  openUpgradeModal();
};

// === ПОКУПКА СЛОТА (ИСПРАВЛЕННАЯ) ===
function updateBuySlotButton() {
  if (slots >= maxSlots) {
    buySlotBtn.textContent = "Максимум слотов достигнут";
    buySlotBtn.disabled = true;
  } else {
    buySlotBtn.textContent = `Купить слот (за 💎${SLOT_PRICE} TON)`;
    buySlotBtn.disabled = false;
  }
}

buySlotBtn.addEventListener("click", () => {
  if (slots >= maxSlots) {
    alert("Достигнут максимум слотов!");
    return;
  }

  if (resources.ton < SLOT_PRICE) {
    alert(`❌ Недостаточно TON!\nНужно: ${SLOT_PRICE} TON\nУ вас: ${resources.ton} TON`);
    return;
  }

  if (confirm(`Купить дополнительный слот за ${SLOT_PRICE} TON?`)) {
    // Вычитаем TON
    resources.ton -= SLOT_PRICE;

    // Увеличиваем количество слотов
    slots++;

    // Добавляем пустой слот в инвентарь
    inventory.push(null);

    // Сохраняем всё
    saveAll();
    renderSlots();

    alert(`✅ Слот куплен за ${SLOT_PRICE} TON!\nТеперь у вас ${slots} слотов.\nОсталось TON: ${resources.ton}`);
  }
});

// === МОДАЛЬНОЕ ОКНО КРАФТА ===
function openCraft(index = null) {
  activeSlotIndex = index;
  craftModal.classList.remove("hidden");
}

closeCraft.addEventListener("click", () => {
  craftModal.classList.add("hidden");
});

openCraftBtn.addEventListener("click", () => openCraft(null));

// === МОДАЛЬНОЕ ОКНО ИНФО О КРАФТЕ ===
closeInfo.addEventListener("click", () => infoModal.classList.add("hidden"));
const infoBody = document.getElementById("infoBody");

// === МОДАЛЬНОЕ ОКНО УЛУЧШЕНИЯ ===
if (closeUpgrade) {
  closeUpgrade.addEventListener("click", () => {
    if (upgradeModal) upgradeModal.classList.add("hidden");
    pendingUpgrade = null;
  });
}

if (confirmUpgrade) {
  confirmUpgrade.addEventListener("click", () => {
    if (!pendingUpgrade) {
      showToast("Нет данных для улучшения.", "error");
      return;
    }

    const { index, from, to, cost, name } = pendingUpgrade;
    const item = inventory[index];

    if (!item || item.name !== name || Number(item.lvl) !== from) {
      showToast("Инструмент изменился. Откройте улучшение заново.", "error");
      if (upgradeModal) upgradeModal.classList.add("hidden");
      pendingUpgrade = null;
      return;
    }

    if (isProducing(index)) {
      showToast("Нельзя улучшать во время производства.", "error");
      return;
    }

    if (resources.byte < cost.bytes || resources.cb < cost.cb) {
      showToast(`Недостаточно ресурсов: нужно ${cost.bytes} Bytes, ${cost.cb} CB`, "error");
      return;
    }

    resources.byte -= cost.bytes;
    resources.cb -= cost.cb;
    item.lvl = to;
    item.img = toolImages[name][to];
    inventory[index] = item;

    saveAll();
    renderSlots();

    if (upgradeModal) upgradeModal.classList.add("hidden");
    pendingUpgrade = null;
    showToast(`Улучшено: ${name} ${to} lvl`, "success");
  });
}

// === НАЖАТИЕ НА "СКРАФТИТЬ" ===
  document.querySelectorAll(".craft-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const itemNode = e.target.closest(".craft-item");
      selectedItem = itemNode.dataset.item;
      selectedLvl = itemNode.querySelector(".lvl-select").value;

      const data = craftData[selectedItem][selectedLvl];

      infoBody.innerHTML = `
      <p><b>${selectedItem} ${selectedLvl} lvl</b></p>
      <p><b>Craft:</b> ${data.craft.bytes} Bytes, ${data.craft.cb} CB</p>
      <p><b>Service:</b> ${data.service.bytes} Bytes, ${data.service.cb} CB, ${data.service.energy} Energy</p>
      <p><b>Exit:</b> ${data.exit.amount} ${data.exit.name}</p>
    `;
      craftModal.classList.add("hidden");
      infoModal.classList.remove("hidden");
    });
  });

// === ПОДТВЕРЖДЕНИЕ КРАФТА ===
confirmCraftBtn.addEventListener("click", () => {
  if (!selectedItem || !selectedLvl) {
    alert("❌ Ошибка: не выбран предмет для крафта");
    return;
  }

  const cost = craftData[selectedItem][selectedLvl].craft;

  // Проверяем достаточно ли ресурсов для крафта
  if (resources.byte < cost.bytes || resources.cb < cost.cb) {
    showToast(`Недостаточно ресурсов для крафта: нужно ${cost.bytes} Bytes, ${cost.cb} CB`, "error");
    return;
  }

  if (activeSlotIndex === null) {
    // Ищем первый пустой слот
    activeSlotIndex = inventory.findIndex(slot => slot === null);
    if (activeSlotIndex === -1) {
      alert("Нет свободных слотов!");
      return;
    }
  }

  // Проверяем что слот пустой
  if (inventory[activeSlotIndex] !== null) {
    alert("Этот слот уже занят!");
    return;
  }

  // ВЫЧИТАЕМ РЕСУРСЫ
  resources.byte -= cost.bytes;
  resources.cb -= cost.cb;

  // Создаем инструмент
  inventory[activeSlotIndex] = {
    name: selectedItem,
    lvl: Number(selectedLvl),
    img: toolImages[selectedItem][selectedLvl]
  };

  // Сохраняем и обновляем
  saveAll();
  renderSlots();

  infoModal.classList.add("hidden");
  craftModal.classList.add("hidden");

  // Показываем уведомление
  const craftSuccess = document.getElementById("craftSuccess");
  craftSuccess.classList.add("show");
  craftSuccess.classList.remove("hidden");
  setTimeout(() => {
    craftSuccess.classList.remove("show");
    setTimeout(() => craftSuccess.classList.add("hidden"), 400);
  }, 1200);
});

// === ОБРАБОТЧИК КЛИКА НА ИНСТРУМЕНТ ===
slotsContainer.addEventListener("click", (e) => {
  const slot = e.target.closest(".slot");
  if (!slot) return;

  const index = parseInt(slot.dataset.index);
  const item = inventory[index];

  if (!item) {
    openCraft(index);
    return;
  }

  const data = craftData[item.name][item.lvl];
  const service = data.service;
  const producing = isProducing(index);
  const remaining = producing ? formatTimer(productionState[index].endsAt - Date.now()) : null;

  toolBody.innerHTML = `
    <div class="tool-info">
      <p><b>${item.name}</b> - Уровень ${item.lvl}</p>
      <div class="resource-cost">
        <h3>Service (на запуск)</h3>
        <p>Bytes: ${service.bytes}</p>
        <p>CB: ${service.cb}</p>
        <p>Energy: ${service.energy}</p>
      </div>
      <div class="production-output">
        <h3>Выход (через 6 часов)</h3>
        <p>${data.exit.amount} ${data.exit.name}</p>
      </div>
      ${producing ? `<div class="current-production"><h3>Осталось</h3><p>${remaining}</p></div>` : ""}
    </div>
  `;

  toolModal.classList.remove("hidden");
  toolModal.dataset.currentIndex = index;
  currentToolIndex = index;
  setUpgradeButtonState(item);

  closeTool.onclick = function() {
    toolModal.classList.add("hidden");
  };
});

// === АВТОЗАПУСК: модалки + найм ===
const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_WORKERS = {
  logan: { durationMs: 3 * DAY_MS },
  jason: { durationMs: 7 * DAY_MS }
};
const AUTO_LAST_TICK_KEY = "autoLastTick";

function normalizeHiredWorkers() {
  const now = Date.now();
  const raw = JSON.parse(localStorage.getItem("hiredWorkers") || "{}");
  const normalized = {};
  Object.keys(AUTO_WORKERS).forEach((worker) => {
    const entry = raw[worker];
    if (entry && typeof entry === "object" && Number.isFinite(entry.expiresAt)) {
      normalized[worker] = entry;
    } else if (entry === true) {
      normalized[worker] = { expiresAt: now + AUTO_WORKERS[worker].durationMs };
    }
  });
  localStorage.setItem("hiredWorkers", JSON.stringify(normalized));
  return normalized;
}

function getAutoLastTick() {
  const raw = parseInt(localStorage.getItem(AUTO_LAST_TICK_KEY) || "0", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function setAutoLastTick(value) {
  if (Number.isFinite(value)) {
    localStorage.setItem(AUTO_LAST_TICK_KEY, String(Math.floor(value)));
  }
}

function cleanupExpiredWorkers(now = Date.now()) {
  let changed = false;
  Object.keys(AUTO_WORKERS).forEach((worker) => {
    const entry = hiredWorkers[worker];
    if (entry && Number.isFinite(entry.expiresAt) && entry.expiresAt <= now) {
      delete hiredWorkers[worker];
      changed = true;
    }
  });
  if (changed) saveHiredWorkers();
}

function formatDurationShort(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getAutoIntervals() {
  const intervals = [];
  Object.keys(AUTO_WORKERS).forEach((worker) => {
    const entry = hiredWorkers[worker];
    if (!entry || !Number.isFinite(entry.expiresAt)) return;
    const duration = AUTO_WORKERS[worker].durationMs;
    const start = entry.expiresAt - duration;
    const end = entry.expiresAt;
    intervals.push([start, end]);
  });
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  intervals.forEach(([start, end]) => {
    if (!merged.length || start > merged[merged.length - 1][1]) {
      merged.push([start, end]);
      return;
    }
    merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
  });
  return merged;
}

function isAutoActive(now = Date.now()) {
  const intervals = getAutoIntervals();
  for (let i = 0; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    if (now >= start && now < end) return true;
  }
  return false;
}

const autoStartModal = document.getElementById("autoStartModal");
const loganModal = document.getElementById("loganModal");
const jasonModal = document.getElementById("jasonModal");
let hireButtons = document.querySelectorAll(".auto-hire-btn[data-worker]");

let hiredWorkers = normalizeHiredWorkers();

function openModal(modal) {
  if (modal) modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (modal) modal.classList.add("hidden");
}

function saveHiredWorkers() {
  localStorage.setItem("hiredWorkers", JSON.stringify(hiredWorkers));
}

function getCurrencyLabel(type) {
  if (type === "cb") return "CB";
  if (type === "ton") return "TON";
  return type;
}

function setHiredState(worker, entry) {
  const now = Date.now();
  const hired = !!entry && Number.isFinite(entry.expiresAt) && entry.expiresAt > now;
  hireButtons.forEach(btn => {
    if (btn.dataset.worker !== worker) return;
    if (hired) {
      btn.classList.add("hired");
      btn.textContent = "Нанят";
      btn.disabled = true;
    } else {
      btn.classList.remove("hired");
      btn.textContent = "Нанять";
      btn.disabled = false;
    }
  });

  document.querySelectorAll(`.auto-worker-status[data-worker="${worker}"]`).forEach(node => {
    node.textContent = hired ? "Нанят" : "";
  });
}

function updateWorkerStatusText(worker, entry) {
  const now = Date.now();
  const hired = !!entry && Number.isFinite(entry.expiresAt) && entry.expiresAt > now;
  const remaining = hired ? formatDurationShort(entry.expiresAt - now) : "";
  if (!hired || !remaining) return;
  document.querySelectorAll(`.auto-worker-status[data-worker="${worker}"]`).forEach(node => {
    node.textContent = `Active: ${remaining}`;
  });
}

function refreshHiredUI() {
  hireButtons = document.querySelectorAll(".auto-hire-btn[data-worker]");
  cleanupExpiredWorkers();
  setHiredState("logan", hiredWorkers.logan);
  setHiredState("jason", hiredWorkers.jason);
  updateWorkerStatusText("logan", hiredWorkers.logan);
  updateWorkerStatusText("jason", hiredWorkers.jason);
}

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("#autoStartBtn");
  if (openBtn) {
    openModal(autoStartModal);
    return;
  }

  const closeBtn = e.target.closest(".auto-close");
  if (closeBtn) {
    const id = closeBtn.dataset.close;
    if (!id) return;
    const modal = document.getElementById(id);
    closeModal(modal);
    return;
  }

  const btn = e.target.closest(".auto-hire-btn[data-worker]");
  if (!btn) return;

  const worker = btn.dataset.worker;
  const isHire = btn.dataset.hire === "true";
  if (!isHire) {
    closeModal(autoStartModal);
    if (worker === "logan") openModal(loganModal);
    if (worker === "jason") openModal(jasonModal);
    return;
  }

  if (hiredWorkers[worker] && Number.isFinite(hiredWorkers[worker].expiresAt) && hiredWorkers[worker].expiresAt > Date.now()) {
    alert("Этот работник уже нанят.");
    return;
  }

  const price = parseFloat(btn.dataset.price || "0");
  const currency = btn.dataset.currency || "";
  const balance = Number(resources[currency] || 0);

  if (!Number.isFinite(price) || price <= 0 || !currency) return;
  if (balance < price) {
    alert(`Недостаточно ${getCurrencyLabel(currency)} для покупки.\nНужно: ${price}\nУ вас: ${balance}`);
    return;
  }

  if (!confirm(`Нанять ${worker === "logan" ? "Logan" : "Jason"} за ${price} ${getCurrencyLabel(currency)}?`)) {
    return;
  }

  resources[currency] = balance - price;
  updateAllResources();

  const durationMs = AUTO_WORKERS[worker] ? AUTO_WORKERS[worker].durationMs : 0;
  hiredWorkers[worker] = { expiresAt: Date.now() + durationMs };
  saveHiredWorkers();
  refreshHiredUI();
  setAutoLastTick(Date.now());
});

// === MARKET: иконки → модалки ===
function autoStartAllAtTime(atTime, autoActive = null) {
  const active = autoActive === null ? isAutoActive(atTime) : autoActive;
  if (!active) return 0;
  let started = 0;
  for (let i = 0; i < slots; i++) {
    if (!inventory[i]) continue;
    if (isProducing(i, atTime)) continue;
    if (startProductionAutoAtIndex(i, atTime)) started += 1;
  }
  return started;
}

function autoStartTick() {
  const now = Date.now();
  cleanupExpiredWorkers(now);
  if (!isAutoActive(now)) return;
  const started = autoStartAllAtTime(now, true);
  if (started > 0) {
    updateEnergyUI();
    renderSlots();
  }
}

function processDueCompletions(atTime) {
  for (let i = 0; i < productionState.length; i++) {
    const entry = productionState[i];
    if (entry && Number.isFinite(entry.endsAt) && entry.endsAt <= atTime) {
      finishProduction(i, { silent: true, updateUI: false });
    }
  }
}

function getNextCompletionAfter(atTime) {
  let next = Infinity;
  for (let i = 0; i < productionState.length; i++) {
    const entry = productionState[i];
    if (entry && Number.isFinite(entry.endsAt) && entry.endsAt > atTime && entry.endsAt < next) {
      next = entry.endsAt;
    }
  }
  return next;
}

function processSegment(segStart, segEnd, autoActive) {
  if (segEnd <= segStart) return;
  processDueCompletions(segStart);
  if (autoActive) {
    autoStartAllAtTime(segStart, true);
  }
  let current = segStart;
  let guard = 0;
  while (guard < 10000) {
    guard += 1;
    const nextEnd = getNextCompletionAfter(current);
    if (!Number.isFinite(nextEnd) || nextEnd > segEnd) break;
    current = nextEnd;
    processDueCompletions(current);
    if (autoActive) {
      autoStartAllAtTime(current, true);
    }
  }
}

function processOfflineAuto() {
  const now = Date.now();
  normalizeProductionState();
  let lastTick = getAutoLastTick();
  if (!lastTick || !Number.isFinite(lastTick)) {
    setAutoLastTick(now);
    updateEnergyUI();
    return;
  }
  if (lastTick > now) lastTick = now;

  const intervals = getAutoIntervals();
  let cursor = lastTick;

  if (!intervals.length) {
    processSegment(cursor, now, false);
  } else {
    for (let i = 0; i < intervals.length; i++) {
      const [start, end] = intervals[i];
      if (cursor >= now) break;
      if (end <= cursor) continue;
      if (start > cursor) {
        const gapEnd = Math.min(start, now);
        processSegment(cursor, gapEnd, false);
        cursor = gapEnd;
      }
      if (cursor >= now) break;
      const segStart = Math.max(cursor, start);
      const segEnd = Math.min(end, now);
      if (segEnd > segStart) {
        processSegment(segStart, segEnd, true);
        cursor = segEnd;
      }
    }
    if (cursor < now) {
      processSegment(cursor, now, false);
    }
  }

  saveProductionState();
  updateEnergyUI();
  setAutoLastTick(now);
  cleanupExpiredWorkers(now);
}

const marketIcons = document.querySelectorAll(".res-icons img");
const energyMarketModal = document.getElementById("energyMarketModal");
const byteMarketModal = document.getElementById("byteMarketModal");
const cbMarketModal = document.getElementById("cbMarketModal");

marketIcons.forEach(img => {
  img.addEventListener("click", () => {
    const type = img.dataset.market;
    if (type === "energy" && energyMarketModal) energyMarketModal.classList.remove("hidden");
    if (type === "byte" && byteMarketModal) byteMarketModal.classList.remove("hidden");
    if (type === "cb" && cbMarketModal) cbMarketModal.classList.remove("hidden");
  });
});

// закрытие MARKET-модалок
document.querySelectorAll(".market-modal .market-close").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal");
    if (modal) modal.classList.add("hidden");
  });
});

// закрытие любых модалок по клику по фону
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});

// === MARKET: вкладки "Продажа / Покупка" ===
document.querySelectorAll(".market-tabs").forEach(tabBox => {
  const tabs = tabBox.querySelectorAll(".market-tab");
  const panels = tabBox.closest("#market").querySelectorAll(".market-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      panels.forEach(p => p.classList.remove("active"));
      document.querySelector("." + tab.dataset.tab + "-panel").classList.add("active");
    });
  });
});

// === MARKET: МОИ ОБЪЯВЛЕНИЯ ===
const myOrdersBtn = document.getElementById("myOrdersBtn");
const myOrdersModal = document.getElementById("myOrdersModal");
const ordersGrid = document.getElementById("ordersGrid");
const ordersClose = myOrdersModal ? myOrdersModal.querySelector(".orders-close") : null;

const MAX_ORDER_SLOTS = 6;
const FREE_ORDER_SLOTS = 4;
const ORDER_SLOT_PRICE = 1; // TON

let orderSlotsUnlocked = parseInt(localStorage.getItem("orderSlotsUnlocked")) || FREE_ORDER_SLOTS;
if (orderSlotsUnlocked < FREE_ORDER_SLOTS) orderSlotsUnlocked = FREE_ORDER_SLOTS;
if (orderSlotsUnlocked > MAX_ORDER_SLOTS) orderSlotsUnlocked = MAX_ORDER_SLOTS;

let myOrders = JSON.parse(localStorage.getItem("myOrders"));
if (!Array.isArray(myOrders)) {
  myOrders = Array(MAX_ORDER_SLOTS).fill(null);
  saveOrders();
}

function saveOrders() {
  localStorage.setItem("myOrders", JSON.stringify(myOrders));
  localStorage.setItem("orderSlotsUnlocked", String(orderSlotsUnlocked));
}

function renderMyOrders() {
  if (!ordersGrid) return;
  ordersGrid.innerHTML = "";

  for (let i = 0; i < MAX_ORDER_SLOTS; i++) {
    const slot = document.createElement("div");
    slot.className = "order-slot";

    if (i < orderSlotsUnlocked) {
      const order = myOrders[i];
      if (order) {
        slot.innerHTML = `
          <div class="order-card">
            <div class="order-icon"><img src="${order.icon}" alt="${order.type}"></div>
            <div class="order-meta">
              <span>${order.amount}</span>
              <span class="order-price">💎 ${order.price}</span>
            </div>
            <button class="order-cancel" data-index="${i}">Отменить</button>
          </div>
        `;
      } else {
        slot.classList.add("empty");
        slot.innerHTML = `<div class="order-plus">+</div>`;
      }
    } else {
      slot.classList.add("empty");
      const buyBtn = document.createElement("button");
      buyBtn.className = "slot-buy-btn";
      buyBtn.textContent = `Купить за 💎${ORDER_SLOT_PRICE} TON`;
      buyBtn.addEventListener("click", () => {
        if (resources.ton < ORDER_SLOT_PRICE) {
          alert("❌ Недостаточно TON для покупки слота!");
          return;
        }
        if (confirm(`Купить слот за ${ORDER_SLOT_PRICE} TON?`)) {
          resources.ton -= ORDER_SLOT_PRICE;
          orderSlotsUnlocked += 1;
          saveOrders();
          updateAllResources();
          renderMyOrders();
        }
      });
      slot.appendChild(buyBtn);
    }

    ordersGrid.appendChild(slot);
  }

  // привязка отмены
  ordersGrid.querySelectorAll(".order-cancel").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      if (Number.isFinite(index)) {
        const order = myOrders[index];
        if (order && order.type && Number.isFinite(order.amount)) {
          resources[order.type] = (resources[order.type] || 0) + order.amount;
          updateAllResources();
        }
        myOrders[index] = null;
        saveOrders();
        renderMyOrders();
      }
    });
  });

  // плюсик в пустых слотах → открыть Market / Продажа
  ordersGrid.querySelectorAll(".order-slot.empty .order-plus").forEach(plus => {
    plus.addEventListener("click", () => {
      if (myOrdersModal) myOrdersModal.classList.add("hidden");

      // переключаемся на страницу Market
      const marketPage = document.getElementById("market");
      if (marketPage) {
        pages.forEach(p => p.classList.remove("active"));
        marketPage.classList.add("active");
        navButtons.forEach(b => b.classList.remove("active"));
        const marketBtn = document.querySelector(".nav-btn[data-page='market']");
        if (marketBtn) marketBtn.classList.add("active");
      }

      // включаем вкладку "Продажа"
      document.querySelectorAll(".market-tab").forEach(t => t.classList.remove("active"));
      const sellTab = document.querySelector(".market-tab[data-tab='sell']");
      if (sellTab) sellTab.classList.add("active");
      document.querySelectorAll(".market-panel").forEach(p => p.classList.remove("active"));
      const sellPanel = document.querySelector(".sell-panel");
      if (sellPanel) sellPanel.classList.add("active");
    });
  });
}

function getOrderTypeFromModal(modal) {
  if (!modal) return null;
  if (modal.id === "energyMarketModal") return "energy";
  if (modal.id === "byteMarketModal") return "byte";
  if (modal.id === "cbMarketModal") return "cb";

  const icon = modal.querySelector(".res-icon img");
  const alt = icon ? icon.alt : "";
  if (alt.toLowerCase() === "energy") return "energy";
  if (alt.toLowerCase() === "byte") return "byte";
  if (alt.toLowerCase() === "cb") return "cb";
  return null;
}

function getOrderIconByType(type) {
  if (type === "energy") return "Ton/Energy icon.png";
  if (type === "byte") return "Ton/Byte icon.png";
  if (type === "cb") return "Ton/Cb icon.png";
  return "";
}

function addOrderFromModal(modal) {
  if (!modal) return;

  const inputs = modal.querySelectorAll(".res-controls .res-input");
  if (inputs.length < 2) return;

  const qty = parseFloat(String(inputs[0].value).replace(",", "."));
  const price = parseFloat(String(inputs[1].value).replace(",", "."));
  const type = getOrderTypeFromModal(modal);

  if (!type || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
    alert("❌ Укажите количество и цену для объявления");
    return;
  }

  if (!resources[type] || resources[type] < qty) {
    alert(`❌ Недостаточно ресурса для продажи!\nНужно: ${qty}\nУ вас: ${resources[type] || 0}`);
    return;
  }

  const freeIndex = myOrders.slice(0, orderSlotsUnlocked).findIndex(o => o === null);
  if (freeIndex === -1) {
    alert("❌ Нет свободных слотов для объявления. Купите дополнительный слот.");
    return;
  }

  resources[type] -= qty;
  updateAllResources();

  myOrders[freeIndex] = {
    type,
    icon: getOrderIconByType(type),
    amount: qty,
    price: price
  };
  saveOrders();

  modal.classList.add("hidden");

  if (myOrdersModal && !myOrdersModal.classList.contains("hidden")) {
    renderMyOrders();
  }
}

// Кнопка "Продать" → добавление объявления
document.querySelectorAll(".res-sell").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal");
    addOrderFromModal(modal);
  });
});

// Делегирование кликов, чтобы кнопка работала стабильно
document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("#myOrdersBtn");
  if (openBtn && myOrdersModal) {
    e.preventDefault();
    myOrdersModal.classList.remove("hidden");
    renderMyOrders();
    return;
  }

  const closeBtn = e.target.closest("#myOrdersModal .orders-close");
  if (closeBtn && myOrdersModal) {
    e.preventDefault();
    myOrdersModal.classList.add("hidden");
  }
});

// === MARKET: покупка ресурсов ===
(() => {
  const marketTabs = document.querySelectorAll(".market-tab");
  const sellPanel  = document.querySelector(".sell-panel");
  const buyPanel   = document.querySelector(".buy-panel");
  const resButtons = document.querySelectorAll(".buy-res-btn");
  const buyList    = document.getElementById("buyItemsContainer");

  if (!marketTabs.length || !sellPanel || !buyPanel || !buyList) return;

  const buyOffers = {
    energy: [
      { amount: 400, price: 0.6 },
      { amount: 400, price: 0.6 },
      { amount: 400, price: 0.6 },
      { amount: 400, price: 0.6 },
      { amount: 400, price: 0.6 },
      { amount: 400, price: 0.6 },
    ],
    byte: [
      { amount: 200, price: 0.3 },
      { amount: 200, price: 0.3 },
      { amount: 200, price: 0.3 },
      { amount: 200, price: 0.3 },
      { amount: 200, price: 0.3 },
      { amount: 200, price: 0.3 },
      { amount: 400, price: 0.6 },
    ],
    cb: [
      { amount: 50, price: 0.25 },
      { amount: 120, price: 0.55 },
      { amount: 120, price: 0.55 },
      { amount: 120, price: 0.55 },
      { amount: 120, price: 0.55 },
      { amount: 120, price: 0.55 },
      { amount: 120, price: 0.55 },
    ]
  };

  function renderBuyItems(type) {
    const list = buyOffers[type] || [];
    buyList.innerHTML = "";

    list.forEach((offer, index) => {
      const card = document.createElement("div");
      card.className = "buy-card";
      card.innerHTML = `
        <div class="buy-card-icon">
          <img src="${
            type === "energy"
              ? "Ton/Energy icon.png"
              : type === "byte"
                ? "Ton/Byte icon.png"
                : "Ton/Cb icon.png"
          }" alt="${type}">
        </div>
        <div class="buy-card-info">
          <span class="buy-amount">${offer.amount}</span>
          <span class="buy-price">${offer.price}</span>
        </div>
        <button class="buy-card-btn" data-type="${type}" data-amount="${offer.amount}" data-price="${offer.price}">Купить</button>
      `;
      const buyBtn = card.querySelector(".buy-card-btn");
      if (buyBtn) buyBtn.dataset.index = String(index);
      buyList.appendChild(card);
    });
  }

  renderBuyItems("energy");

  marketTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      marketTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const mode = tab.dataset.tab;
      if (mode === "buy") {
        sellPanel.classList.add("hidden");
        buyPanel.classList.remove("hidden");
      } else {
        sellPanel.classList.remove("hidden");
        buyPanel.classList.add("hidden");
      }
    });
  });

  resButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      resButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderBuyItems(btn.dataset.type);
    });
  });

  function getBuyLabel(type) {
    if (type === "energy") return "энергии";
    if (type === "byte") return "байтов";
    if (type === "cb") return "CB";
    return type;
  }

  function normalizeTon(value) {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(4));
  }

  buyList.addEventListener("click", (e) => {
    const btn = e.target.closest(".buy-card-btn");
    if (!btn) return;

    const type = btn.dataset.type;

    const index = Number(btn.dataset.index);

    const amount = parseFloat(String(btn.dataset.amount || "").replace(",", "."));
    const price = parseFloat(String(btn.dataset.price || "").replace(",", "."));

    if (!type || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) {
      alert("❌ Некорректные данные для покупки.");
      return;
    }

    const tonBalance = Number(resources.ton || 0);
    if (!Number.isFinite(tonBalance) || tonBalance < price) {
      alert(`❌ Недостаточно TON!\nНужно: ${price} TON\nУ вас: ${Number.isFinite(tonBalance) ? tonBalance : 0} TON`);
      return;
    }

    const label = getBuyLabel(type);

    resources.ton = normalizeTon(tonBalance - price);
    if (type === "energy") {
      energyCans = (Number(energyCans) || 0) + amount;
      updateEnergyUI();
    } else {
      resources[type] = (Number(resources[type]) || 0) + amount;
      updateAllResources();
    }

    // One-time listings: remove from list after purchase
    const list = buyOffers[type];
    if (Array.isArray(list) && Number.isFinite(index) && index >= 0 && index < list.length) {
      list.splice(index, 1);
      renderBuyItems(type);
    }


    if (typeof showToast === "function") {
      showToast(`Куплено: +${amount} ${label}`, "success");
    }
  });
})();

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
let mainTickCounter = 0;
function mainTick() {
  updateProductionTimers();
  autoStartTick();
  mainTickCounter += 1;
  if (mainTickCounter % 10 === 0) {
    refreshHiredUI();
  }
  setAutoLastTick(Date.now());
}

document.addEventListener('DOMContentLoaded', function() {
  // Восстанавливаем все данные
  processOfflineAuto();
  renderSlots();
  updateBuySlotButton();
  mainTick();
  setInterval(mainTick, 1000);
  refreshHiredUI();
});
// === РАСЧЕТ ПРОДАЖИ ПО ФЛОРУ (МОДАЛКИ MARKET) ===
function setupFloorCalc(modal) {
  if (!modal) return;

  const inputs = modal.querySelectorAll(".res-controls .res-input");
  const floorEl = modal.querySelector(".res-floor");
  const checkbox = modal.querySelector(".res-check input[type='checkbox']");

  if (inputs.length < 2 || !floorEl || !checkbox) return;

  const qtyInput = inputs[0];   // верхняя строка
  const priceInput = inputs[1]; // нижняя строка

  function getFloorValue() {
    const raw = floorEl.dataset.floor || floorEl.textContent || "";
    const num = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(num) ? num : 0;
  }
  function recalc() {
    if (!checkbox.checked) return;
    const qty = parseFloat(String(qtyInput.value).replace(",", "."));
    const floor = getFloorValue();

    if (!Number.isFinite(qty) || qty < 0 || floor <= 0) {
      priceInput.value = "0";
      return;
    }

    const total = qty * floor;
    priceInput.value = total.toFixed(4);
  }

  checkbox.addEventListener("change", recalc);
  qtyInput.addEventListener("input", recalc);
}

document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".market-modal").forEach(setupFloorCalc);
});
