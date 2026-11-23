export const motionTokens = {
  duration: {
    fast: 0.14,
    normal: 0.2,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    sheet: 32,
  },
} as const;
