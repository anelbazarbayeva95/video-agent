// Feature flags for the "Best Frame Intelligence" direction.
//
// Kadr's primary experience is frame analysis + explainable ranking. Generated
// assets (stickers, thumbnail, story) and the asset-pack/ZIP flow are hidden
// from the primary UI but their code and backend routes are preserved — flip
// this to bring the asset-pack experience back.
export const ASSET_GENERATION = false;

// Expand (generative outpaint) and Resize (smart crop) remain available as
// secondary per-frame export actions in the lightbox editor.
export const FRAME_EDITOR = true;
