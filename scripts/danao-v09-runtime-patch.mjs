const replaceRequired = (source, pattern, replacement, label) => {
  if (!pattern.test(source)) throw new Error(`Danao v0.9 runtime patch marker missing: ${label}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
};

const NETWORK_METHODS = `
  function setRemoteInput(slot, frame = {}) {
    if (!networkMode || !networkIsHost || !Number.isInteger(slot)) return false;
    const seq = Number(frame.seq);
    const previous = remoteInputSeqs.get(slot) ?? -1;
    if (Number.isInteger(seq) && seq <= previous) return false;
    if (Number.isInteger(seq)) remoteInputSeqs.set(slot, seq);
    remoteInputs.set(slot, {
      moveX: Math.max(-1, Math.min(1, Number(frame.moveX) || 0)),
      moveZ: Math.max(-1, Math.min(1, Number(frame.moveY) || 0)),
      jump: Boolean(frame.jump),
      light: Boolean(frame.punch),
      grab: Boolean(frame.grab),
      heavy: Boolean(frame.fire),
      dodge: Boolean(frame.dodge),
    });
    return true;
  }

  function readNetworkInput() {
    if (!networkMode || networkLocalSlot < 0) return null;
    const fighter = fighters.find((entry) => entry.slot === networkLocalSlot);
    if (!fighter?.active) return neutralInput();
    return currentInput(fighter);
  }

  function captureNetworkSnapshot() {
    if (!networkMode || !networkIsHost) return null;
    return {
      matchId: networkMatchId,
      phase: matchOver ? 'results' : 'fight',
      fighters: fighters.map((fighter) => {
        const p = fighter.body.translation();
        const v = fighter.body.linvel();
        return {
          slot: fighter.slot,
          x: p.x, y: p.y, z: p.z,
          vx: v.x, vy: v.y, vz: v.z,
          hp: Math.max(0, Math.min(100, Math.round(fighter.health))),
          active: Boolean(fighter.active),
          ko: Boolean(fighter.ko),
          heldPropId: fighter.heldPropId || null,
          grabbedFighterId: fighter.grabbedFighterId || null,
        };
      }),
      props: props.map((prop) => {
        const p = prop.body.translation();
        return {
          id: prop.id,
          x: p.x, y: p.y, z: p.z,
          broken: Boolean(prop.broken),
          holderId: prop.holderId || null,
        };
      }),
    };
  }

  function applyNetworkSnapshot(snapshot, exact = false) {
    if (!networkMode || !snapshot || typeof snapshot !== 'object') return false;
    const seq = Number(snapshot.seq);
    if (!exact && Number.isInteger(seq) && seq <= networkLastSnapshotSeq) return false;
    if (Number.isInteger(seq)) networkLastSnapshotSeq = Math.max(networkLastSnapshotSeq, seq);

    for (const state of snapshot.fighters || []) {
      if (!state || !Number.isInteger(state.slot)) continue;
      const fighter = fighters.find((entry) => entry.slot === state.slot);
      if (!fighter) continue;
      if (Number.isFinite(state.hp)) fighter.health = Math.max(0, Math.min(100, Math.round(state.hp)));
      if (typeof state.active === 'boolean') fighter.active = state.active;
      if (typeof state.ko === 'boolean') fighter.ko = state.ko;
      fighter.heldPropId = typeof state.heldPropId === 'string' ? state.heldPropId : null;
      fighter.grabbedFighterId = typeof state.grabbedFighterId === 'string' ? state.grabbedFighterId : null;

      const current = fighter.body.translation();
      const isLocalPrediction = !networkIsHost && fighter.slot === networkLocalSlot && !exact;
      const blend = exact ? 1 : (isLocalPrediction ? 0.22 : 0.62);
      const next = {
        x: current.x + ((Number(state.x) || 0) - current.x) * blend,
        y: current.y + ((Number(state.y) || 0) - current.y) * blend,
        z: current.z + ((Number(state.z) || 0) - current.z) * blend,
      };
      fighter.body.setTranslation(next, true);
      if (!isLocalPrediction || exact) {
        fighter.body.setLinvel({
          x: Number(state.vx) || 0,
          y: Number(state.vy) || 0,
          z: Number(state.vz) || 0,
        }, true);
      }
    }

    for (const state of snapshot.props || []) {
      if (!state || typeof state.id !== 'string') continue;
      const prop = props.find((entry) => entry.id === state.id);
      if (!prop) continue;
      prop.broken = Boolean(state.broken);
      prop.holderId = typeof state.holderId === 'string' ? state.holderId : null;
      prop.visual.setEnabled(!prop.broken);
      if (!prop.broken) prop.body.setTranslation({
        x: Number(state.x) || 0,
        y: Number(state.y) || 0,
        z: Number(state.z) || 0,
      }, true);
    }
    pushHud();
    return true;
  }

  function setNetworkAuthority({ enabled = false, isHost = false, localSlot = -1, players = [], matchId = 0 } = {}) {
    networkMode = Boolean(enabled);
    networkIsHost = networkMode && Boolean(isHost);
    networkLocalSlot = networkMode && Number.isInteger(localSlot) ? localSlot : -1;
    networkPlayers = Array.isArray(players) ? players.map((player) => ({ ...player })) : [];
    networkMatchId = Number.isInteger(matchId) ? matchId : 0;
    if (!networkMode) {
      remoteInputs.clear();
      remoteInputSeqs.clear();
      networkLastSnapshotSeq = -1;
    }
    for (const fighter of fighters) {
      const remoteOnClient = networkMode && !networkIsHost && fighter.slot !== networkLocalSlot;
      if (fighter.body.setBodyType && RAPIER?.RigidBodyType) {
        fighter.body.setBodyType(remoteOnClient ? RAPIER.RigidBodyType.KinematicPositionBased : RAPIER.RigidBodyType.Dynamic, true);
      }
      fighter.body.setGravityScale?.(remoteOnClient ? 0 : 1, true);
    }
    for (const prop of props) {
      const remoteProp = networkMode && !networkIsHost;
      if (prop.body.setBodyType && RAPIER?.RigidBodyType) {
        prop.body.setBodyType(remoteProp ? RAPIER.RigidBodyType.KinematicPositionBased : RAPIER.RigidBodyType.Dynamic, true);
      }
      prop.body.setGravityScale?.(remoteProp ? 0 : 1, true);
    }
    if (networkMode && networkIsHost) {
      for (const player of networkPlayers) {
        if (!player?.connected && player?.id !== networkLocalSlot) remoteInputs.set(player.id, neutralInput());
      }
    }
    return { enabled: networkMode, isHost: networkIsHost, localSlot: networkLocalSlot };
  }

`;

export function patchDanaoV09Runtime(source) {
  let out = String(source);

  out = replaceRequired(
    out,
    /import \{ botIntent, botProfileForSlot \} from '\.\/bot\.js';/,
    "import { botIntent, botProfileForSlot } from './bot.js';\nimport { localControlPlan } from './controllers.js';",
    'controller import',
  );

  out = replaceRequired(
    out,
    /let hitStopUntil = 0;/,
    `let hitStopUntil = 0;
  let networkMode = false;
  let networkIsHost = false;
  let networkLocalSlot = -1;
  let networkPlayers = [];
  let networkMatchId = 0;
  let networkLastSnapshotSeq = -1;
  const remoteInputs = new Map();
  const remoteInputSeqs = new Map();`,
    'network state',
  );

  out = replaceRequired(
    out,
    /if \(fighter\.control\.type === 'hybrid'\) return mergeInput\(readKeyboard\(keys\), readGamepad\(0\)\);/,
    `if (fighter.control.type === 'hybrid' || fighter.control.type === 'network-local') return mergeInput(readKeyboard(keys), readGamepad(fighter.control.index));
    if (fighter.control.type === 'remote') return remoteInputs.get(fighter.slot) || neutralInput();`,
    'hybrid and remote pad input',
  );

  out = replaceRequired(
    out,
    /const total = Math\.max\(2, Math\.min\(4, 1 \+ \(Number\(options\.botCount\) \|\| 3\)\)\);\n\s*const pads = globalThis\.navigator\?\.getGamepads\?\.\(\) \|\| \[\];\n\s*fighters = \[\];\n\s*for \(let i = 0; i < total; i\+\+\) \{\n\s*let control;\n\s*if \(i === 0\) control = \{ type: 'hybrid', index: 0 \};\n\s*else if \(pads\[i\]\) control = \{ type: 'gamepad', index: i \};\n\s*else control = \{ type: 'bot' \};\n\s*fighters\.push\(createFighter\(i, currentArena\.spawns\[i\], styles\[i\], control\)\);\n\s*\}/,
    `const pads = globalThis.navigator?.getGamepads?.() || [];
    const online = options.online && Array.isArray(options.online.players) ? options.online : null;
    fighters = [];
    if (online) {
      networkMode = true;
      networkIsHost = Boolean(online.isHost);
      networkLocalSlot = Number.isInteger(online.localPlayerId) ? online.localPlayerId : 0;
      networkPlayers = online.players.map((player) => ({ ...player }));
      networkMatchId = Number.isInteger(online.matchId) ? online.matchId : 0;
      networkLastSnapshotSeq = -1;
      remoteInputs.clear();
      remoteInputSeqs.clear();
      const localPlan = localControlPlan(pads, 1);
      const roomPlayers = online.players
        .filter((player) => Number.isInteger(player?.id) && player.id >= 0 && player.id < 4)
        .sort((a, b) => a.id - b.id);
      for (const player of roomPlayers) {
        const style = FIGHTER_STYLES.find((candidate) => candidate.name === player.character) || FIGHTER_STYLES[player.id % FIGHTER_STYLES.length];
        const control = player.id === networkLocalSlot
          ? { type: 'network-local', index: localPlan[0]?.index ?? null }
          : { type: 'remote' };
        fighters.push(createFighter(player.id, currentArena.spawns[player.id], style, control));
      }
    } else {
      networkMode = false;
      networkIsHost = false;
      networkLocalSlot = -1;
      networkPlayers = [];
      networkMatchId = 0;
      remoteInputs.clear();
      remoteInputSeqs.clear();
      const total = Math.max(2, Math.min(4, 1 + (Number(options.botCount) || 3)));
      const controlPlan = localControlPlan(pads, total);
      for (let i = 0; i < total; i++) {
        let control;
        control = controlPlan[i];
        fighters.push(createFighter(i, currentArena.spawns[i], styles[i], control));
      }
    }`,
    'online/local control plan',
  );

  out = replaceRequired(
    out,
    /function updateFighter\(fighter, now\) \{\n\s*if \(!fighter\.active \|\| matchOver \|\| fighter\.grabbedById\) return;/,
    `function updateFighter(fighter, now) {
    if (!fighter.active || matchOver || fighter.grabbedById) return;
    if (networkMode && !networkIsHost && fighter.slot !== networkLocalSlot) return;`,
    'non-host remote fighter suppression',
  );

  out = replaceRequired(
    out,
    /applyMovement\(fighter, raw, edges, now\);\n\s*if \(edges\.lightPressed\) performAttack\(fighter, 'light', now\);\n\s*if \(edges\.heavyPressed\) performAttack\(fighter, 'heavy', now\);\n\s*if \(edges\.grabPressed\) performGrab\(fighter, now\);/,
    `applyMovement(fighter, raw, edges, now);
    if (!networkMode || networkIsHost) {
      if (edges.lightPressed) performAttack(fighter, 'light', now);
      if (edges.heavyPressed) performAttack(fighter, 'heavy', now);
      if (edges.grabPressed) performGrab(fighter, now);
    }`,
    'host combat authority',
  );

  out = replaceRequired(
    out,
    /function fixedUpdate\(now, inputLocked = false\) \{\n\s*if \(!inputLocked\) \{\n\s*for \(const fighter of fighters\) updateFighter\(fighter, now\);\n\s*updateHazards\(now\);\n\s*\}\n\s*world\.step\(\);\n\s*checkRingOuts\(now\);\n\s*\}/,
    `function fixedUpdate(now, inputLocked = false) {
    if (!inputLocked) {
      for (const fighter of fighters) updateFighter(fighter, now);
      if (!networkMode || networkIsHost) updateHazards(now);
    }
    world.step();
    if (!networkMode || networkIsHost) checkRingOuts(now);
  }`,
    'host world authority',
  );

  out = replaceRequired(
    out,
    /\n\s*function knockOut\(/,
    `\n${NETWORK_METHODS}  function knockOut(`,
    'network methods',
  );

  out = replaceRequired(
    out,
    /return \{ startMenuAudio, startMatch, stopMatch, setPaused, setSettings, dispose \};/,
    'return { startMenuAudio, startMatch, stopMatch, setPaused, setSettings, setRemoteInput, readNetworkInput, captureNetworkSnapshot, applyNetworkSnapshot, setNetworkAuthority, dispose };',
    'runtime public online hooks',
  );

  return out;
}
