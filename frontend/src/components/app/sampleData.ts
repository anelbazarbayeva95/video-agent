// Pre-computed "Try a sample clip" result — a ballet-studio reel (the frames in
// public/screenshots/v02-*.jpg). It lets the portfolio link show an impressive,
// fully-populated analysis in <1s with NO backend call, even when the free
// Render instance is cold or asleep. Live upload remains the real path.
//
// Honesty note (see CLAUDE.md "measured vs AI" rule): the `metrics` here are the
// REAL deterministic values — sharpness (variance-of-Laplacian, floored/normalized
// across the set), exposure (mean luminance), and uniqueness (aHash distance) —
// computed from these exact images with the same Pillow algorithm the backend
// uses. The `reason`/`scores` are illustrative AI-style interpretation, shown
// under the "AI interpretation" label just like live results.
import type { BestFrame } from "../../api";

export const SAMPLE_TITLE = "sample-ballet-studio.mp4";

export const SAMPLE_FRAMES: BestFrame[] =
[
  {
    "timestamp": 12.0,
    "reason": "A crisp, front-facing portrait mid\u2013port de bras \u2014 the face is clearly lit against the window and both arms frame the body symmetrically, making it the strongest standalone hero shot.",
    "imageUrl": "/screenshots/v02-03.jpg",
    "score": 92,
    "scores": {
      "sharpness": 88,
      "face": 82,
      "composition": 90
    },
    "scene": {
      "index": 2,
      "label": "Port de bras by the window",
      "start": 11.0,
      "end": 20.5
    },
    "label": "Speaker Close-up",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 74,
      "sharpnessRaw": 40,
      "exposure": 131,
      "uniqueness": 6
    },
    "evidence": [
      "Well-balanced exposure (avg 131/255)",
      "Similar framing to another pick"
    ]
  },
  {
    "timestamp": 15.5,
    "reason": "Arms sweep overhead in a low, heroic angle; the expression reads as focused and the lifted line gives the frame strong upward energy.",
    "imageUrl": "/screenshots/v02-04.jpg",
    "score": 87,
    "scores": {
      "sharpness": 70,
      "face": 80,
      "composition": 86
    },
    "scene": {
      "index": 2,
      "label": "Port de bras by the window",
      "start": 11.0,
      "end": 20.5
    },
    "label": "Speaker Close-up",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 26,
      "sharpnessRaw": 26,
      "exposure": 105,
      "uniqueness": 31
    },
    "evidence": [
      "Well-balanced exposure (avg 105/255)",
      "Visually distinct from the other picks"
    ]
  },
  {
    "timestamp": 27.0,
    "reason": "An elegant profile silhouetted against the bright window \u2014 the cleanest, sharpest frame of the set, with a calm, editorial quality.",
    "imageUrl": "/screenshots/v02-06.jpg",
    "score": 83,
    "scores": {
      "sharpness": 90,
      "face": 45,
      "composition": 88
    },
    "scene": {
      "index": 3,
      "label": "Turn to the window",
      "start": 24.0,
      "end": 32.0
    },
    "label": "Clean Visual",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 100,
      "sharpnessRaw": 48,
      "exposure": 133,
      "uniqueness": 6
    },
    "evidence": [
      "Sharpest of the selected frames",
      "Well-balanced exposure (avg 133/255)",
      "Similar framing to another pick"
    ]
  },
  {
    "timestamp": 2.0,
    "reason": "Pointe shoes fully en pointe with the tulle skirt still swirling \u2014 a decisive detail moment that captures the motion and craft of the dance.",
    "imageUrl": "/screenshots/v02-01.jpg",
    "score": 80,
    "scores": {
      "sharpness": 72,
      "face": null,
      "composition": 84
    },
    "scene": {
      "index": 1,
      "label": "Pointe work at the barre",
      "start": 0.0,
      "end": 7.0
    },
    "label": "Clean Visual",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 65,
      "sharpnessRaw": 37,
      "exposure": 132,
      "uniqueness": 17
    },
    "evidence": [
      "Well-balanced exposure (avg 132/255)"
    ]
  },
  {
    "timestamp": 19.0,
    "reason": "A soft, expressive tilt of the head with a hint of a smile and warm backlight \u2014 emotive, though focus is gentler than the sharper picks.",
    "imageUrl": "/screenshots/v02-05.jpg",
    "score": 76,
    "scores": {
      "sharpness": 55,
      "face": 74,
      "composition": 82
    },
    "scene": {
      "index": 2,
      "label": "Port de bras by the window",
      "start": 11.0,
      "end": 20.5
    },
    "label": "Speaker Close-up",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 15,
      "sharpnessRaw": 23,
      "exposure": 106,
      "uniqueness": 39
    },
    "evidence": [
      "Well-balanced exposure (avg 106/255)",
      "Visually distinct from the other picks"
    ]
  },
  {
    "timestamp": 4.5,
    "reason": "A second pointe detail from the same phrase; strong but close in framing to the leading pointe-work pick.",
    "imageUrl": "/screenshots/v02-02.jpg",
    "score": 71,
    "scores": {
      "sharpness": 70,
      "face": null,
      "composition": 78
    },
    "scene": {
      "index": 1,
      "label": "Pointe work at the barre",
      "start": 0.0,
      "end": 7.0
    },
    "label": "Clean Visual",
    "duration": 33.0,
    "analyzed": 16,
    "metrics": {
      "sharpness": 68,
      "sharpnessRaw": 38,
      "exposure": 129,
      "uniqueness": 17
    },
    "evidence": [
      "Well-balanced exposure (avg 129/255)"
    ]
  }
]
;
