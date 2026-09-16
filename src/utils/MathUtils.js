export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (start, end, amount) => start + (end - start) * amount;

export const inverseLerp = (start, end, value) => {
  if (Math.abs(end - start) < Number.EPSILON) {
    return 0;
  }
  return (value - start) / (end - start);
};

export const mapRange = (value, inMin, inMax, outMin, outMax) =>
  lerp(outMin, outMax, inverseLerp(inMin, inMax, value));

export const randomRange = (min, max) => min + Math.random() * (max - min);

export const randomInt = (min, max) => Math.floor(randomRange(min, max + 1));

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
