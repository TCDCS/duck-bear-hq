export const TOUCH_ACTION_KEYS = Object.freeze({
  up: 'KeyW',
  left: 'KeyA',
  down: 'KeyS',
  right: 'KeyD',
  jump: 'Space',
  punch: 'KeyJ',
  grab: 'KeyK',
  dodge: 'KeyL',
});

const KEY_VALUES = Object.freeze({
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  Space: ' ',
  KeyJ: 'j',
  KeyK: 'k',
  KeyL: 'l',
});

export function actionKey(action) {
  return TOUCH_ACTION_KEYS[String(action || '')] || null;
}

export function createVirtualKeyState(dispatch) {
  if (typeof dispatch !== 'function') throw new TypeError('Danao touch controls need a key dispatcher.');
  const pointerToCode = new Map();
  const codeToPointers = new Map();

  function release(pointerId) {
    if (!pointerToCode.has(pointerId)) return false;
    const code = pointerToCode.get(pointerId);
    pointerToCode.delete(pointerId);
    const holders = codeToPointers.get(code);
    holders?.delete(pointerId);
    if (!holders?.size) {
      codeToPointers.delete(code);
      dispatch(code, false);
    }
    return true;
  }

  function press(pointerId, action) {
    const code = actionKey(action);
    if (!code || pointerId == null) return false;
    release(pointerId);
    let holders = codeToPointers.get(code);
    if (!holders) {
      holders = new Set();
      codeToPointers.set(code, holders);
    }
    if (!holders.size) dispatch(code, true);
    holders.add(pointerId);
    pointerToCode.set(pointerId, code);
    return true;
  }

  function releaseAll() {
    for (const code of codeToPointers.keys()) dispatch(code, false);
    pointerToCode.clear();
    codeToPointers.clear();
  }

  return {
    press,
    release,
    releaseAll,
    isPressed(action) {
      const code = actionKey(action);
      return Boolean(code && codeToPointers.get(code)?.size);
    },
    get size() { return pointerToCode.size; },
  };
}

function dispatchKeyboard(target, code, down) {
  const KeyboardEventCtor = globalThis.KeyboardEvent;
  if (!target?.dispatchEvent || typeof KeyboardEventCtor !== 'function') return false;
  const event = new KeyboardEventCtor(down ? 'keydown' : 'keyup', {
    code,
    key: KEY_VALUES[code] || '',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return true;
}

function button(action, symbol, label, extra = '') {
  return `<button type="button" class="danao-touch-btn ${extra}" data-touch-action="${action}" aria-label="${label}"><span>${symbol}</span><small>${label}</small></button>`;
}

export function mountTouchControls({
  root = globalThis.document?.body,
  target = globalThis.window,
  forceVisible = false,
} = {}) {
  if (!root?.appendChild || !globalThis.document?.createElement) {
    return {
      setActive() {},
      setPaused() {},
      releaseAll() {},
      dispose() {},
      get active() { return false; },
    };
  }

  const shell = globalThis.document.createElement('section');
  shell.className = 'danao-touch-shell';
  if (forceVisible) shell.classList.add('force-visible');
  shell.setAttribute('aria-label', 'Danao touch controls');
  shell.setAttribute('aria-hidden', 'true');
  shell.innerHTML = `
    <div class="danao-rotate-hint" aria-hidden="true">↻ ROTATE FOR THE BEST CONTROLS</div>
    <div class="danao-touch-pad danao-touch-move" aria-label="Movement controls">
      ${button('up', '▲', 'Up', 'move-up')}
      ${button('left', '◀', 'Left', 'move-left')}
      <div class="danao-touch-center" aria-hidden="true">闹</div>
      ${button('right', '▶', 'Right', 'move-right')}
      ${button('down', '▼', 'Down', 'move-down')}
    </div>
    <div class="danao-touch-pad danao-touch-actions" aria-label="Action controls">
      ${button('jump', 'A', 'Jump', 'action-jump')}
      ${button('punch', 'X', 'Punch', 'action-punch')}
      ${button('grab', 'Y', 'Grab', 'action-grab')}
      ${button('dodge', 'B', 'Dodge', 'action-dodge')}
    </div>
  `;
  root.appendChild(shell);

  const virtualKeys = createVirtualKeyState((code, down) => dispatchKeyboard(target, code, down));
  const pointerButtons = new Map();
  let active = false;
  let paused = false;

  const releasePointer = (pointerId) => {
    const buttonEl = pointerButtons.get(pointerId);
    pointerButtons.delete(pointerId);
    buttonEl?.classList?.remove('pressed');
    virtualKeys.release(pointerId);
  };

  const controls = [...shell.querySelectorAll('[data-touch-action]')];
  for (const control of controls) {
    control.addEventListener('pointerdown', (event) => {
      if (!active || paused) return;
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId ?? 0;
      releasePointer(pointerId);
      const action = control.dataset.touchAction;
      if (!virtualKeys.press(pointerId, action)) return;
      pointerButtons.set(pointerId, control);
      control.classList.add('pressed');
      try { control.setPointerCapture?.(pointerId); } catch {}
    });

    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      control.addEventListener(type, (event) => {
        event.preventDefault();
        releasePointer(event.pointerId ?? 0);
      });
    }
  }

  shell.addEventListener('contextmenu', (event) => event.preventDefault());

  const releaseAll = () => {
    for (const buttonEl of pointerButtons.values()) buttonEl?.classList?.remove('pressed');
    pointerButtons.clear();
    virtualKeys.releaseAll();
  };

  const onBlur = () => releaseAll();
  const ownerDocument = shell.ownerDocument;
  const onVisibility = () => {
    if (ownerDocument?.hidden) releaseAll();
  };
  target?.addEventListener?.('blur', onBlur);
  ownerDocument?.addEventListener?.('visibilitychange', onVisibility);

  return {
    setActive(next) {
      active = Boolean(next);
      if (!active) {
        paused = false;
        releaseAll();
      }
      shell.classList.toggle('is-active', active);
      shell.classList.toggle('is-paused', paused);
      shell.setAttribute('aria-hidden', active ? 'false' : 'true');
    },
    setPaused(next) {
      paused = active && Boolean(next);
      if (paused) releaseAll();
      shell.classList.toggle('is-paused', paused);
    },
    releaseAll,
    get active() { return active; },
    dispose() {
      active = false;
      paused = false;
      releaseAll();
      target?.removeEventListener?.('blur', onBlur);
      ownerDocument?.removeEventListener?.('visibilitychange', onVisibility);
      shell.remove();
    },
  };
}
