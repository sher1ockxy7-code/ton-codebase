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
  const format2 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "0";
    const s = n.toFixed(2).replace(/\.?0+$/, "");
    return s.replace(".", ",");
  };
  document.getElementById('tonValue').textContent = format2(resources.ton);
  document.getElementById('energyValue').textContent = format2(resources.energy);
  document.getElementById('byteValue').textContent = format2(resources.byte);
  document.getElementById('cbValue').textContent = format2(resources.cb);
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
const toolModal = document.getElementById('toolModal');
const toolBody = document.getElementById('toolBody');
const closeTool = document.getElementById('closeTool');
const startTool = document.getElementById('startTool');
const upgradeTool = document.getElementById('upgradeTool');

// КОНСТАНТЫ
const maxSlots = 10;
const SLOT_PRICE = 1;

// ПЕРЕМЕННЫЕ
let activeSlotIndex = null;
let selectedItem = null;
let selectedLvl = null;

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
      productionTime: 10000
    },
    2: { 
      craft: { bytes: 3300, cb: 1750 }, 
      service: { bytes: 24, cb: 16, energy: 380 }, 
      exit: { amount: 260, type: "energy", name: "energy bottles" },
      productionTime: 15000
    },
    3: { 
      craft: { bytes: 6500, cb: 3400 }, 
      service: { bytes: 46, cb: 30, energy: 740 }, 
      exit: { amount: 430, type: "energy", name: "energy bottles" },
      productionTime: 20000
    }
  },
  ByteMachine: {
    1: { 
      craft: { bytes: 2500, cb: 1300 }, 
      service: { energy: 280, cb: 5, bytes: 16 }, 
      exit: { amount: 75, type: "byte", name: "bytes" },
      productionTime: 10000
    },
    2: { 
      craft: { bytes: 4800, cb: 2400 }, 
      service: { energy: 540, cb: 12, bytes: 30 }, 
      exit: { amount: 152, type: "byte", name: "bytes" },
      productionTime: 15000
    },
    3: { 
      craft: { bytes: 9500, cb: 4600 }, 
      service: { energy: 1030, cb: 25, bytes: 58 }, 
      exit: { amount: 305, type: "byte", name: "bytes" },
      productionTime: 20000
    }
  },
  CBBank: {
    1: { 
      craft: { bytes: 2800, cb: 1500 }, 
      service: { energy: 300, bytes: 32, cb: 17 }, 
      exit: { amount: 72, type: "cb", name: "CB Bucks" },
      productionTime: 10000
    },
    2: { 
      craft: { bytes: 5600, cb: 2900 }, 
      service: { energy: 580, bytes: 62, cb: 32 }, 
      exit: { amount: 145, type: "cb", name: "CB Bucks" },
      productionTime: 15000
    },
    3: { 
      craft: { bytes: 11200, cb: 5800 }, 
      service: { energy: 1050, bytes: 120, cb: 62 }, 
      exit: { amount: 292, type: "cb", name: "CB Bucks" },
      productionTime: 20000
    }
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

// === ОТРИСОВКА СЛОТОВ ===
function renderSlots() {
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

      const lvl = document.createElement("div");
      lvl.classList.add("level");
      lvl.textContent = `${item.lvl} lvl`;
      slot.appendChild(lvl);
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
    alert(`❌ Недостаточно ресурсов для крафта!\nНужно: ${cost.bytes} Byte, ${cost.cb} CB`);
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

  toolBody.innerHTML = `
    <p><b>${item.name}</b> - Уровень ${item.lvl}</p>
    <p>Этот инструмент уже создан.</p>
    <p>Для производства нужно добавить систему запуска.</p>
  `;

  toolModal.classList.remove("hidden");
  toolModal.dataset.currentIndex = index;

  startTool.onclick = function() {
    alert("🚀 Система производства будет добавлена позже!");
    toolModal.classList.add("hidden");
  };

  upgradeTool.onclick = function() {
    alert("⤴️ Система улучшения будет добавлена позже!");
    toolModal.classList.add("hidden");
  };

  closeTool.onclick = function() {
    toolModal.classList.add("hidden");
  };
});

// === АВТОЗАПУСК: открытие окна и переход к работникам ===
const autoStartModal = document.getElementById("autoStartModal");
const loganModal = document.getElementById("loganModal");
const jasonModal = document.getElementById("jasonModal");
let hireButtons = document.querySelectorAll(".auto-hire-btn[data-worker]");

let hiredWorkers = JSON.parse(localStorage.getItem("hiredWorkers") || "{}");

const WORKER_CONFIG = {
  logan: { name: "Logan", days: 3 },
  jason: { name: "Jason", days: 7 }
};

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

function normalizeHiredWorkers() {
  const now = Date.now();
  let changed = false;
  Object.keys(hiredWorkers || {}).forEach(worker => {
    const cfg = WORKER_CONFIG[worker];
    if (!cfg) return;
    const data = hiredWorkers[worker];
    if (data === true) {
      delete hiredWorkers[worker];
      changed = true;
      return;
    }
    if (!data || typeof data !== "object") {
      delete hiredWorkers[worker];
      changed = true;
      return;
    }
    if (!Number.isFinite(data.endsAt)) {
      delete hiredWorkers[worker];
      changed = true;
    }
  });
  if (changed) saveHiredWorkers();
}

function isWorkerActive(worker) {
  const data = hiredWorkers[worker];
  return !!data && Number.isFinite(data.endsAt) && Date.now() < data.endsAt;
}

function getRemainingHours(worker) {
  const data = hiredWorkers[worker];
  if (!data || !Number.isFinite(data.endsAt)) return 0;
  const ms = data.endsAt - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (60 * 60 * 1000));
}

function cleanupExpiredWorkers() {
  let changed = false;
  Object.keys(hiredWorkers || {}).forEach(worker => {
    if (!isWorkerActive(worker)) {
      delete hiredWorkers[worker];
      changed = true;
    }
  });
  if (changed) saveHiredWorkers();
}

function updateWorkerStatusUI(worker) {
  const nodes = document.querySelectorAll(`.auto-worker-status[data-worker="${worker}"]`);
  if (!nodes.length) return;
  const active = isWorkerActive(worker);
  const hoursLeft = getRemainingHours(worker);
  nodes.forEach(node => {
    if (active) {
      node.classList.remove("inactive");
      node.textContent = `Работает в авто-запуске. Осталось: ${hoursLeft} ч.`;
    } else {
      node.classList.add("inactive");
      node.textContent = "Не работает";
    }
  });
}

normalizeHiredWorkers();

function setHiredState(worker, hired) {
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
}

function refreshHiredUI() {
  cleanupExpiredWorkers();
  hireButtons = document.querySelectorAll(".auto-hire-btn[data-worker]");
  setHiredState("logan", isWorkerActive("logan"));
  setHiredState("jason", isWorkerActive("jason"));
  updateWorkerStatusUI("logan");
  updateWorkerStatusUI("jason");
  bindHireButtons();
}

function handleHireClick(btn) {
  if (!btn || btn.disabled) return;
  const worker = btn.dataset.worker;
  const cfg = WORKER_CONFIG[worker];
  if (!cfg) return;
  const isHire = btn.dataset.hire === "true";
  if (!isHire) {
    closeModal(autoStartModal);
    if (worker === "logan") openModal(loganModal);
    if (worker === "jason") openModal(jasonModal);
    return;
  }

  if (isWorkerActive(worker)) {
    alert(`Этот работник уже нанят.\nОсталось: ${getRemainingHours(worker)} ч.`);
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

  if (!confirm(`Внимание!\nНанять ${cfg.name} на ${cfg.days} дн. за ${price} ${getCurrencyLabel(currency)}?\nОплата спишется сразу.`)) {
    return;
  }

  resources[currency] = balance - price;
  updateAllResources();

  const now = Date.now();
  hiredWorkers[worker] = {
    hiredAt: now,
    endsAt: now + cfg.days * 24 * 60 * 60 * 1000
  };
  saveHiredWorkers();
  refreshHiredUI();
  alert(`✅ ${cfg.name} нанят.\nОн работает в авто-запуске.\nОсталось: ${getRemainingHours(worker)} ч.`);
}

function bindHireButtons() {
  hireButtons.forEach(btn => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleHireClick(btn);
    });
  });
}

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("#autoStartBtn");
  if (openBtn) {
    openModal(autoStartModal);
    return;
  }

  const closeBtn = e.target.closest(".auto-close, .auto-hire-btn[data-close]");
  if (closeBtn) {
    const id = closeBtn.dataset.close;
    if (!id) return;
    const modal = document.getElementById(id);
    closeModal(modal);
    return;
  }

  const btn = e.target.closest(".auto-hire-btn[data-worker]");
  if (!btn) return;
  handleHireClick(btn);
});

document.addEventListener("DOMContentLoaded", () => {
  refreshHiredUI();
  setInterval(refreshHiredUI, 30000);
});

// === MARKET: иконки → модалки ===
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

    list.forEach(offer => {
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
      buyList.appendChild(card);
    });
  }

  function removeOffer(type, amount, price) {
    const list = buyOffers[type] || [];
    const index = list.findIndex(o => o.amount === amount && o.price === price);
    if (index !== -1) {
      list.splice(index, 1);
    }
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

  // покупка ресурса за TON
  buyList.addEventListener("click", (e) => {
    const btn = e.target.closest(".buy-card-btn");
    if (!btn) return;

    const type = btn.dataset.type;
    const amount = parseFloat(btn.dataset.amount);
    const price = parseFloat(btn.dataset.price);

    if (!type || !Number.isFinite(amount) || !Number.isFinite(price)) return;

    if (resources.ton < price) {
      alert(`❌ Недостаточно TON!\nНужно: ${price}\nУ вас: ${resources.ton}`);
      return;
    }

    resources.ton -= price;
    resources[type] = (resources[type] || 0) + amount;
    updateAllResources();

    removeOffer(type, amount, price);
    renderBuyItems(type);
  });
})();

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', function() {
  // Восстанавливаем все данные
  updateAllResources();
  renderSlots();
  updateBuySlotButton();
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
