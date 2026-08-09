const KEY_MAP = {
  // Row 0 (Top Row) — Y=23
  Q: { x: 23, y: 23, row: 0, finger: 'left-pinky' },
  W: { x: 76, y: 23, row: 0, finger: 'left-ring' },
  E: { x: 129, y: 23, row: 0, finger: 'left-middle' },
  R: { x: 182, y: 23, row: 0, finger: 'left-index' },
  T: { x: 235, y: 23, row: 0, finger: 'left-index' },
  Y: { x: 288, y: 23, row: 0, finger: 'right-index' },
  U: { x: 341, y: 23, row: 0, finger: 'right-index' },
  I: { x: 394, y: 23, row: 0, finger: 'right-middle' },
  O: { x: 447, y: 23, row: 0, finger: 'right-ring' },
  P: { x: 500, y: 23, row: 0, finger: 'right-pinky' },

  // Row 1 (Home Row) — Y=76
  A: { x: 41, y: 76, row: 1, finger: 'left-pinky' },
  S: { x: 94, y: 76, row: 1, finger: 'left-ring' },
  D: { x: 147, y: 76, row: 1, finger: 'left-middle' },
  F: { x: 200, y: 76, row: 1, finger: 'left-index' },
  G: { x: 253, y: 76, row: 1, finger: 'left-index' },
  H: { x: 306, y: 76, row: 1, finger: 'right-index' },
  J: { x: 359, y: 76, row: 1, finger: 'right-index' },
  K: { x: 412, y: 76, row: 1, finger: 'right-middle' },
  L: { x: 465, y: 76, row: 1, finger: 'right-ring' },
  ';': { x: 518, y: 76, row: 1, finger: 'right-pinky' },

  // Row 2 (Bottom Row) — Y=129
  Z: { x: 69, y: 129, row: 2, finger: 'left-pinky' },
  X: { x: 122, y: 129, row: 2, finger: 'left-ring' },
  C: { x: 175, y: 129, row: 2, finger: 'left-middle' },
  V: { x: 228, y: 129, row: 2, finger: 'left-index' },
  B: { x: 281, y: 129, row: 2, finger: 'left-index' },
  N: { x: 334, y: 129, row: 2, finger: 'right-index' },
  M: { x: 387, y: 129, row: 2, finger: 'right-index' },

  // Row 3 (Spacebar) — Y=182
  SPACE: { x: 276, y: 182, row: 3, finger: 'thumb' },
};

const LEFT_HOLOGRAM_FINGERS = [
  {
    id: 'left-pinky',
    hand: 'left',
    tip: [41, 76],
    dip: [43, 115],
    pip: [48, 160],
    mcp: [60, 230],
  },
  {
    id: 'left-ring',
    hand: 'left',
    tip: [94, 76],
    dip: [95, 112],
    pip: [96, 155],
    mcp: [98, 225],
  },
  {
    id: 'left-middle',
    hand: 'left',
    tip: [147, 76],
    dip: [146, 108],
    pip: [144, 152],
    mcp: [138, 224],
  },
  {
    id: 'left-index',
    hand: 'left',
    tip: [200, 76],
    dip: [194, 112],
    pip: [186, 156],
    mcp: [172, 228],
  },
  {
    id: 'thumb',
    hand: 'left',
    fingerMapId: 'thumb',
    tip: [232, 178],
    dip: [218, 202],
    pip: [198, 232],
    mcp: [170, 275],
  },
];

const RIGHT_HOLOGRAM_FINGERS = [
  {
    id: 'thumb-right',
    hand: 'right',
    fingerMapId: 'thumb',
    tip: [320, 178],
    dip: [334, 202],
    pip: [354, 232],
    mcp: [382, 275],
  },
  {
    id: 'right-index',
    hand: 'right',
    tip: [359, 76],
    dip: [365, 112],
    pip: [372, 156],
    mcp: [386, 228],
  },
  {
    id: 'right-middle',
    hand: 'right',
    tip: [412, 76],
    dip: [413, 108],
    pip: [415, 152],
    mcp: [420, 224],
  },
  {
    id: 'right-ring',
    hand: 'right',
    tip: [465, 76],
    dip: [464, 112],
    pip: [463, 155],
    mcp: [454, 225],
  },
  {
    id: 'right-pinky',
    hand: 'right',
    tip: [518, 76],
    dip: [516, 115],
    pip: [511, 160],
    mcp: [492, 230],
  },
];

module.exports = { KEY_MAP, LEFT_HOLOGRAM_FINGERS, RIGHT_HOLOGRAM_FINGERS };
