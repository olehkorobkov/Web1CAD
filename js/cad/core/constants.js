const REDRAW_DEBOUNCE_MS = 16;

const AUTO_SAVE_INTERVAL = 300000;

const MAX_UNDO_STEPS = 50;

const LINEWEIGHT_VALUES = [
    { value: 'byLayer', label: 'ByLayer' },
    { value: 0.00, label: '0.00 mm' },
    { value: 0.05, label: '0.05 mm' },
    { value: 0.09, label: '0.09 mm' },
    { value: 0.13, label: '0.13 mm' },
    { value: 0.18, label: '0.18 mm' },
    { value: 0.25, label: '0.25 mm' },
    { value: 0.30, label: '0.30 mm' },
    { value: 0.35, label: '0.35 mm' },
    { value: 0.50, label: '0.50 mm' },
    { value: 0.70, label: '0.70 mm' },
    { value: 1.00, label: '1.00 mm' },
    { value: 1.40, label: '1.40 mm' },
    { value: 2.00, label: '2.00 mm' }
];

const LINETYPE_PATTERNS = {
    'continuous': [],                           // __________ Solid line
    'dashed': [15, 5],                         // ---- ---- Long dashes
    'dotted': [1, 4],                          // . . . . . Small dots
    'dashdot': [15, 4, 1, 4],                 // ---- . ---- . Dash-dot
    'center': [25, 5, 5, 5]                   // -------- - -------- - Center line
};

const LINETYPE_VALUES = [
    { value: 'byLayer', label: 'ByLayer' },
    { value: 'continuous', label: 'Continuous' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'dashdot', label: 'Dash-Dot' },
    { value: 'center', label: 'Center Line' }
];

const EXPLODE_SEGMENTS = 64; 

const BASE_GRID_STEP = 100;
const SUB_GRID_STEP = 20;