const GRID_WIDTH = 8;
const GRID_HEIGHT = 6;
const GRID_SIZE = GRID_WIDTH * GRID_HEIGHT;

const buildingCatalog = {
  empty: { name: 'Empty', icon: '·', health: 0, cost: { gold: 0, elixir: 0 }, income: { gold: 0, elixir: 0 }, damage: 0, range: 0, power: 0 },
  hall: { name: 'Town Hall', icon: '🏰', health: 220, cost: { gold: 0, elixir: 0 }, income: { gold: 0, elixir: 0 }, damage: 0, range: 0, power: 30 },
  wall: { name: 'Wall', icon: '🧱', health: 180, cost: { gold: 40, elixir: 0 }, income: { gold: 0, elixir: 0 }, damage: 0, range: 0, power: 6 },
  mine: { name: 'Gold Mine', icon: '🪙', health: 120, cost: { gold: 90, elixir: 0 }, income: { gold: 8, elixir: 0 }, damage: 0, range: 0, power: 10 },
  pump: { name: 'Elixir Pump', icon: '🧪', health: 120, cost: { gold: 0, elixir: 90 }, income: { gold: 0, elixir: 8 }, damage: 0, range: 0, power: 10 },
  cannon: { name: 'Cannon', icon: '💣', health: 140, cost: { gold: 120, elixir: 20 }, income: { gold: 0, elixir: 0 }, damage: 22, range: 2, power: 22 },
  archer: { name: 'Archer Tower', icon: '🏹', health: 125, cost: { gold: 150, elixir: 30 }, income: { gold: 0, elixir: 0 }, damage: 18, range: 3, power: 24 },
  mortar: { name: 'Mortar', icon: '🪨', health: 130, cost: { gold: 160, elixir: 60 }, income: { gold: 0, elixir: 0 }, damage: 28, range: 3, power: 28 }
};

const troopCatalog = {
  barbarian: { name: 'Barbarian', icon: '⚔️', cost: 55, damage: 18, health: 55 },
  archer: { name: 'Archer', icon: '🏹', cost: 70, damage: 15, health: 42 },
  giant: { name: 'Giant', icon: '🛡️', cost: 130, damage: 34, health: 140 }
};

const state = {
  gold: 420,
  elixir: 360,
  trophies: 120,
  spells: 1,
  selectedBuilding: 'wall',
  raidStarted: false,
  raidResolved: false,
  raidTicking: false,
  raidInterval: null,
  enemyHallHealth: 100,
  homeBase: [],
  enemyBase: [],
  army: { barbarian: 8, archer: 6, giant: 2 },
  deployedTroops: []
};

const refs = {
  goldValue: document.querySelector('#goldValue'),
  elixirValue: document.querySelector('#elixirValue'),
  trophyValue: document.querySelector('#trophyValue'),
  homePowerValue: document.querySelector('#homePowerValue'),
  enemyHealthValue: document.querySelector('#enemyHealthValue'),
  buildPalette: document.querySelector('#buildPalette'),
  selectionInfo: document.querySelector('#selectionInfo'),
  homeGrid: document.querySelector('#homeGrid'),
  enemyGrid: document.querySelector('#enemyGrid'),
  battleLog: document.querySelector('#battleLog'),
  armyInfo: document.querySelector('#armyInfo'),
  raidInfo: document.querySelector('#raidInfo'),
  tileTemplate: document.querySelector('#tileTemplate'),
  clearSelectionBtn: document.querySelector('#clearSelectionBtn'),
  trainBarbarianBtn: document.querySelector('#trainBarbarianBtn'),
  trainArcherBtn: document.querySelector('#trainArcherBtn'),
  trainGiantBtn: document.querySelector('#trainGiantBtn'),
  brewSpellBtn: document.querySelector('#brewSpellBtn'),
  startRaidBtn: document.querySelector('#startRaidBtn'),
  healSpellBtn: document.querySelector('#healSpellBtn'),
  newEnemyBtn: document.querySelector('#newEnemyBtn')
};

function createTile(type = 'empty') {
  const data = buildingCatalog[type];
  return {
    type,
    name: data.name,
    icon: data.icon,
    health: data.health,
    maxHealth: data.health,
    income: { ...data.income },
    damage: data.damage,
    range: data.range,
    power: data.power,
    troopIds: []
  };
}

function indexToCoord(index) {
  return { x: index % GRID_WIDTH, y: Math.floor(index / GRID_WIDTH) };
}

function distanceBetween(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isEdge(index) {
  const { x, y } = indexToCoord(index);
  return x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1;
}

function generateHomeBase() {
  const grid = Array.from({ length: GRID_SIZE }, () => createTile('empty'));
  const placements = new Map([
    [11, 'mine'],
    [12, 'hall'],
    [13, 'pump'],
    [19, 'wall'],
    [20, 'cannon'],
    [21, 'wall'],
    [27, 'mine'],
    [28, 'archer'],
    [29, 'pump'],
    [36, 'mortar']
  ]);
  placements.forEach((type, index) => {
    grid[index] = createTile(type);
  });
  return grid;
}

function generateEnemyBase() {
  const blueprints = [
    new Map([[10, 'mine'], [11, 'wall'], [12, 'hall'], [13, 'wall'], [14, 'pump'], [19, 'cannon'], [20, 'wall'], [21, 'archer'], [27, 'mine'], [28, 'mortar'], [29, 'pump']]),
    new Map([[9, 'wall'], [10, 'mine'], [11, 'cannon'], [12, 'hall'], [13, 'archer'], [18, 'wall'], [19, 'pump'], [20, 'wall'], [21, 'mine'], [28, 'mortar'], [30, 'pump']]),
    new Map([[11, 'mine'], [12, 'archer'], [13, 'hall'], [14, 'pump'], [19, 'wall'], [20, 'cannon'], [21, 'wall'], [27, 'mine'], [28, 'wall'], [29, 'mortar'], [30, 'pump']])
  ];
  const blueprint = blueprints[Math.floor(Math.random() * blueprints.length)];
  const grid = Array.from({ length: GRID_SIZE }, () => createTile('empty'));
  blueprint.forEach((type, index) => {
    grid[index] = createTile(type);
  });
  return grid;
}

function addLog(message, tone = 'neutral') {
  const entry = document.createElement('div');
  entry.className = `log-entry${tone === 'highlight' ? ' highlight' : ''}${tone === 'good' ? ' good' : ''}${tone === 'bad' ? ' bad' : ''}`;
  entry.textContent = message;
  refs.battleLog.prepend(entry);
}

function totalIncome(base) {
  return base.reduce(
    (sum, tile) => {
      if (tile.health <= 0) return sum;
      sum.gold += tile.income.gold;
      sum.elixir += tile.income.elixir;
      return sum;
    },
    { gold: 0, elixir: 0 }
  );
}

function computeBasePower(base) {
  return base.reduce((sum, tile) => sum + (tile.health > 0 ? tile.power : 0), 0);
}

function townHallHealth(base) {
  const hall = base.find((tile) => tile.type === 'hall');
  return hall ? Math.max(0, Math.round((hall.health / hall.maxHealth) * 100)) : 0;
}

function renderPalette() {
  const buildable = ['wall', 'mine', 'pump', 'cannon', 'archer', 'mortar'];
  refs.buildPalette.innerHTML = '';
  buildable.forEach((type) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `palette-card${state.selectedBuilding === type ? ' active' : ''}`;
    const config = buildingCatalog[type];
    card.innerHTML = `<strong>${config.icon} ${config.name}</strong><span>${config.cost.gold}g / ${config.cost.elixir}e</span>`;
    card.addEventListener('click', () => {
      state.selectedBuilding = type;
      renderAll();
    });
    refs.buildPalette.appendChild(card);
  });
}

function renderSelectionInfo() {
  if (!state.selectedBuilding) {
    refs.selectionInfo.innerHTML = '<span>No building selected</span><strong>Choose a structure to place.</strong>';
    return;
  }
  const config = buildingCatalog[state.selectedBuilding];
  refs.selectionInfo.innerHTML = `
    <span>Selected Building</span>
    <strong>${config.icon} ${config.name}</strong>
    <span>Cost: ${config.cost.gold} gold / ${config.cost.elixir} elixir</span>
    <span>HP: ${config.health} • Power: ${config.power}</span>
  `;
}

function renderTile(gridEl, tile, index, clickHandler, enemy = false) {
  const node = refs.tileTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(tile.type);
  if (tile.health <= 0 && tile.type !== 'empty') node.classList.add('destroyed');
  if (tile.type === 'empty') node.classList.add('empty');
  if (isEdge(index)) node.classList.add('edge');
  if (!enemy && state.selectedBuilding && tile.type === state.selectedBuilding) node.classList.add('selected');

  const { x, y } = indexToCoord(index);
  const troopCount = tile.troopIds?.length || 0;
  if (troopCount > 0) {
    node.classList.add('has-troops');
    node.dataset.troops = `+${troopCount}`;
  }

  node.querySelector('.tile-topline').textContent = `${x + 1},${y + 1}`;
  node.querySelector('.tile-icon').textContent = tile.icon;
  node.querySelector('.tile-label').textContent = tile.name;
  node.querySelector('.tile-health').textContent = tile.type === 'empty' ? (enemy ? (isEdge(index) ? 'Deploy edge' : 'No target') : 'Build slot') : `${Math.max(0, Math.round(tile.health))}/${tile.maxHealth}`;
  node.addEventListener('click', () => clickHandler(index));
  gridEl.appendChild(node);
}

function renderGrids() {
  refs.homeGrid.innerHTML = '';
  refs.enemyGrid.innerHTML = '';
  state.homeBase.forEach((tile, index) => renderTile(refs.homeGrid, tile, index, placeBuilding, false));
  state.enemyBase.forEach((tile, index) => renderTile(refs.enemyGrid, tile, index, deployTroops, true));
}

function renderArmyInfo() {
  refs.armyInfo.innerHTML = `
    <div><span>Barbarians</span><strong>${state.army.barbarian}</strong></div>
    <div><span>Archers</span><strong>${state.army.archer}</strong></div>
    <div><span>Giants</span><strong>${state.army.giant}</strong></div>
    <div><span>Heal Spells</span><strong>${state.spells}</strong></div>
  `;
}

function renderRaidInfo() {
  const defenders = state.enemyBase.filter((tile) => ['cannon', 'archer', 'mortar'].includes(tile.type) && tile.health > 0).length;
  const structures = state.enemyBase.filter((tile) => tile.type !== 'empty' && tile.health > 0).length;
  const deployed = state.deployedTroops.length;
  refs.raidInfo.innerHTML = `
    <div><span>Defenses Alive</span><strong>${defenders}</strong></div>
    <div><span>Structures Left</span><strong>${structures}</strong></div>
    <div><span>Raid Status</span><strong>${state.raidStarted ? 'In Progress' : 'Ready'}</strong></div>
    <div><span>Troops Deployed</span><strong>${deployed}</strong></div>
  `;
}

function updateButtons() {
  refs.trainBarbarianBtn.disabled = state.elixir < troopCatalog.barbarian.cost;
  refs.trainArcherBtn.disabled = state.elixir < troopCatalog.archer.cost;
  refs.trainGiantBtn.disabled = state.elixir < troopCatalog.giant.cost;
  refs.brewSpellBtn.disabled = state.elixir < 110;
  refs.startRaidBtn.disabled = state.raidStarted || totalArmyCount() === 0;
  refs.healSpellBtn.disabled = !state.raidStarted || state.spells <= 0 || state.deployedTroops.length === 0;
}

function renderAll() {
  const income = totalIncome(state.homeBase);
  refs.goldValue.textContent = Math.floor(state.gold);
  refs.elixirValue.textContent = Math.floor(state.elixir);
  refs.trophyValue.textContent = state.trophies;
  refs.homePowerValue.textContent = `${computeBasePower(state.homeBase)} • +${income.gold}/${income.elixir}`;
  refs.enemyHealthValue.textContent = `${townHallHealth(state.enemyBase)}%`;
  renderPalette();
  renderSelectionInfo();
  renderArmyInfo();
  renderRaidInfo();
  renderGrids();
  updateButtons();
}

function canAfford(cost) {
  return state.gold >= cost.gold && state.elixir >= cost.elixir;
}

function spend(cost) {
  state.gold -= cost.gold;
  state.elixir -= cost.elixir;
}

function placeBuilding(index) {
  if (!state.selectedBuilding) return;
  if (index === 12) {
    addLog('The Town Hall anchor tile cannot be replaced.', 'bad');
    return;
  }
  const nextType = state.selectedBuilding;
  const nextConfig = buildingCatalog[nextType];
  if (!canAfford(nextConfig.cost)) {
    addLog(`Not enough resources to place ${nextConfig.name}.`, 'bad');
    return;
  }
  spend(nextConfig.cost);
  state.homeBase[index] = createTile(nextType);
  addLog(`Placed ${nextConfig.name} at ${describeIndex(index)}.`, 'good');
  renderAll();
}

function describeIndex(index) {
  const { x, y } = indexToCoord(index);
  return `(${x + 1}, ${y + 1})`;
}

function trainTroop(type) {
  const troop = troopCatalog[type];
  if (state.elixir < troop.cost) return;
  state.elixir -= troop.cost;
  state.army[type] += 1;
  addLog(`Trained ${troop.name}.`, 'good');
  renderAll();
}

function brewSpell() {
  if (state.elixir < 110) return;
  state.elixir -= 110;
  state.spells += 1;
  addLog('Brewed a Heal Spell.', 'good');
  renderAll();
}

function totalArmyCount() {
  return state.army.barbarian + state.army.archer + state.army.giant;
}

function scoutNewBase() {
  if (state.raidStarted) {
    addLog('Finish the active raid before scouting a new base.', 'bad');
    return;
  }
  state.enemyBase = generateEnemyBase();
  state.enemyHallHealth = townHallHealth(state.enemyBase);
  addLog('Scouted a new enemy layout.', 'highlight');
  renderAll();
}

function startRaid() {
  if (totalArmyCount() === 0) return;
  state.raidStarted = true;
  state.raidResolved = false;
  state.deployedTroops = [];
  state.enemyBase.forEach((tile) => {
    tile.troopIds = [];
  });
  startRaidLoop();
  addLog('Raid started. Deploy troops on any outer edge tile.', 'highlight');
  renderAll();
}

function deployTroops(index) {
  if (!state.raidStarted || !isEdge(index)) return;

  const deployPlan = [
    ['giant', 1],
    ['barbarian', 2],
    ['archer', 2]
  ];

  const deployedNow = [];
  deployPlan.forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      if (state.army[type] <= 0) break;
      state.army[type] -= 1;
      const troopId = crypto.randomUUID ? crypto.randomUUID() : `${type}-${Date.now()}-${Math.random()}`;
      state.deployedTroops.push({ id: troopId, type, health: troopCatalog[type].health, index, acted: false });
      state.enemyBase[index].troopIds.push(troopId);
      deployedNow.push(type);
    }
  });

  if (deployedNow.length === 0) {
    addLog('No troops available for deployment.', 'bad');
    return;
  }

  addLog(`Deployed ${deployedNow.join(', ')} at ${describeIndex(index)}.`, 'good');
  renderAll();
}

function findNearestTarget(fromIndex) {
  const from = indexToCoord(fromIndex);
  const aliveTargets = state.enemyBase
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.type !== 'empty' && tile.health > 0);

  aliveTargets.sort((a, b) => {
    const distA = distanceBetween(from, indexToCoord(a.index));
    const distB = distanceBetween(from, indexToCoord(b.index));
    const priorityA = ['cannon', 'archer', 'mortar'].includes(a.tile.type) ? 0 : a.tile.type === 'hall' ? 1 : 2;
    const priorityB = ['cannon', 'archer', 'mortar'].includes(b.tile.type) ? 0 : b.tile.type === 'hall' ? 1 : 2;
    return priorityA - priorityB || distA - distB;
  });

  return aliveTargets[0] || null;
}

function moveTroop(troop, targetIndex) {
  const troopCoord = indexToCoord(troop.index);
  const targetCoord = indexToCoord(targetIndex);
  const nextX = troopCoord.x + Math.sign(targetCoord.x - troopCoord.x);
  const nextY = troopCoord.y + Math.sign(targetCoord.y - troopCoord.y);
  const nextIndex = nextY * GRID_WIDTH + nextX;

  const currentTile = state.enemyBase[troop.index];
  currentTile.troopIds = currentTile.troopIds.filter((id) => id !== troop.id);
  troop.index = nextIndex;
  state.enemyBase[nextIndex].troopIds.push(troop.id);
}

function cleanupTroop(troopId) {
  state.enemyBase.forEach((tile) => {
    tile.troopIds = tile.troopIds.filter((id) => id !== troopId);
  });
  state.deployedTroops = state.deployedTroops.filter((troop) => troop.id !== troopId);
}

function defendersFire() {
  const defensiveTiles = state.enemyBase
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => ['cannon', 'archer', 'mortar'].includes(tile.type) && tile.health > 0);

  defensiveTiles.forEach(({ tile, index }) => {
    if (state.deployedTroops.length === 0) return;
    const origin = indexToCoord(index);
    const inRange = state.deployedTroops
      .map((troop) => ({ troop, distance: distanceBetween(origin, indexToCoord(troop.index)) }))
      .filter(({ distance }) => distance <= tile.range)
      .sort((a, b) => a.distance - b.distance);

    if (inRange.length === 0) return;
    const victim = inRange[0].troop;
    victim.health -= tile.damage;
    if (victim.health <= 0) {
      cleanupTroop(victim.id);
      addLog(`${tile.name} eliminated a ${troopCatalog[victim.type].name}.`, 'bad');
    }
  });
}

function troopsAct() {
  [...state.deployedTroops].forEach((troop) => {
    const target = findNearestTarget(troop.index);
    if (!target) return;

    if (troop.index === target.index) {
      target.tile.health -= troopCatalog[troop.type].damage;
      if (target.tile.health <= 0) {
        target.tile.health = 0;
        addLog(`${troopCatalog[troop.type].name} destroyed ${target.tile.name}.`, 'good');
        const lootGold = target.tile.type === 'mine' ? 70 : target.tile.type === 'hall' ? 120 : 30;
        const lootElixir = target.tile.type === 'pump' ? 70 : target.tile.type === 'hall' ? 120 : 20;
        state.gold += lootGold;
        state.elixir += lootElixir;
        if (target.tile.type === 'hall') {
          state.trophies += 12;
          state.raidResolved = true;
        }
      }
    } else {
      moveTroop(troop, target.index);
    }
  });
}

function resolveRaidState() {
  state.enemyHallHealth = townHallHealth(state.enemyBase);

  if (state.enemyHallHealth <= 0) {
    stopRaidLoop();
    state.raidStarted = false;
    state.deployedTroops = [];
    state.enemyBase.forEach((tile) => {
      tile.troopIds = [];
    });
    addLog('Three-star victory! Enemy Town Hall destroyed.', 'highlight');
    renderAll();
    return true;
  }

  if (state.deployedTroops.length === 0 && totalArmyCount() === 0) {
    stopRaidLoop();
    state.raidStarted = false;
    addLog('Raid ended. Train more troops or scout a new base.', 'bad');
    renderAll();
    return true;
  }

  return false;
}

function raidTick() {
  if (!state.raidStarted) return;
  troopsAct();
  defendersFire();
  resolveRaidState();
  renderAll();
}

function startRaidLoop() {
  stopRaidLoop();
  state.raidInterval = setInterval(raidTick, 900);
}

function stopRaidLoop() {
  if (state.raidInterval) {
    clearInterval(state.raidInterval);
    state.raidInterval = null;
  }
}

function castHealSpell() {
  if (!state.raidStarted || state.spells <= 0 || state.deployedTroops.length === 0) return;
  state.spells -= 1;
  state.deployedTroops.forEach((troop) => {
    troop.health = Math.min(troop.health + 32, troopCatalog[troop.type].health);
  });
  addLog('Heal Spell restored your deployed troops.', 'good');
  renderAll();
}

function passiveTick() {
  const income = totalIncome(state.homeBase);
  state.gold += income.gold / 4;
  state.elixir += income.elixir / 4;
  renderAll();
}

refs.clearSelectionBtn.addEventListener('click', () => {
  state.selectedBuilding = null;
  renderAll();
});
refs.trainBarbarianBtn.addEventListener('click', () => trainTroop('barbarian'));
refs.trainArcherBtn.addEventListener('click', () => trainTroop('archer'));
refs.trainGiantBtn.addEventListener('click', () => trainTroop('giant'));
refs.brewSpellBtn.addEventListener('click', brewSpell);
refs.startRaidBtn.addEventListener('click', startRaid);
refs.healSpellBtn.addEventListener('click', castHealSpell);
refs.newEnemyBtn.addEventListener('click', scoutNewBase);

state.homeBase = generateHomeBase();
state.enemyBase = generateEnemyBase();
addLog('Welcome back, Chief. Design your base, train an army, and raid for trophies.', 'highlight');
renderAll();
setInterval(passiveTick, 1000);
