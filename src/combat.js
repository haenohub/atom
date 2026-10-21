// Input-independent rules shared by the live controller and regression tests.
export const BOW_DRAW_SECONDS = 1.15;
export const clamp01 = value => Math.max(0, Math.min(1, value));
export function bowShot(heldSeconds) {
  const charge = clamp01(Math.max(0, heldSeconds) / BOW_DRAW_SECONDS);
  return { charge, multiplier: .38 + charge * 1.22, speed: 23 + charge * 49, gravity: 9.81, spread: (1 - charge) * .016 };
}
export function skillAvailability(player, skill, cooldown = 0) {
  if (!skill || skill.locked || player.level < skill.level) return '아직 해금되지 않은 스킬입니다.';
  if (cooldown > 0) return '스킬을 준비하고 있습니다.';
  if (player.mana < skill.cost) return '마나가 부족합니다.';
  return null;
}
export function isArrowSkill(player, skill) { return player.classId === 'ranger' && skill?.delivery === 'arrow'; }
export function inSpellArea(target, center, radius, verticalRange = 7) {
  return Math.hypot(target.x - center.x, target.z - center.z) <= radius && Math.abs(target.y - center.y) <= verticalRange;
}
