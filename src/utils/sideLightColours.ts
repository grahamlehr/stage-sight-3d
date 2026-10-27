import type { VenueSource } from '../store/useStageStore';

/** Colours of the two side lights, from stage left (-X) and stage right (+X). */
export interface SideLightColours {
  left: string;
  right: string;
}

const BALLROOM: SideLightColours = { left: '#38bdf8', right: '#f59e0b' };
const NEUTRAL: SideLightColours = { left: '#ffffff', right: '#ffffff' };

/**
 * The ballroom's dark textured walls take a cool and a warm side light as a
 * subtle rim. An uploaded model often has plain white or grey materials, which
 * show those colours almost at full strength, so it gets white side lights and
 * keeps its own colours.
 */
export function sideLightColours(venueSource: VenueSource): SideLightColours {
  return venueSource === 'custom-glb' ? NEUTRAL : BALLROOM;
}
