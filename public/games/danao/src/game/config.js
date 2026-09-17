export const GAME_CONFIG = Object.freeze({
  targetScore: 3,
  maxHealth: 100,
  lightAttack: Object.freeze({ damage: 8, knockback: 5.5, range: 2.1, cooldownMs: 340 }),
  heavyAttack: Object.freeze({ damage: 15, knockback: 11, range: 2.5, cooldownMs: 720 }),
  dodgeSpeed: 10,
  moveSpeed: 5.2,
  jumpImpulse: 6.5,
  respawnMs: 1100,
  ringOutY: -4,
});
