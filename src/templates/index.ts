// Template registry — used by the TemplateGallery to list and create starter templates.

import type { Resolution, SpxTemplate, TemplateType } from '../model/types';
import { createLowerThirdTemplate } from './lowerThird';
import { createFullscreenTemplate } from './fullscreen';
import { createBugTemplate } from './bug';
import { createCountdownTemplate } from './countdown';
import { createScoreboardTemplate } from './scoreboard';
import { createInfoBoxTemplate } from './infoBox';
import { createStartingSoonTemplate } from './startingSoon';
import { createBlankTemplate } from './blank';

export interface TemplateEntry {
  type: TemplateType;
  name: string;
  description: string;
  category: 'Lower Third' | 'Fullscreen' | 'Overlay' | 'Sport' | 'General';
  create: (res: Resolution, fps: number) => SpxTemplate;
}

export const TEMPLATE_REGISTRY: TemplateEntry[] = [
  {
    type: 'lower-third',
    name: 'Lower Third',
    description: 'Name + title bar in the lower portion of the frame. Classic broadcast lower third with GSAP slide animation.',
    category: 'Lower Third',
    create: createLowerThirdTemplate,
  },
  {
    type: 'fullscreen',
    name: 'Fullscreen Title',
    description: 'Full-frame dark overlay with a large centered headline and subtitle. Ideal for announcements and transitions.',
    category: 'Fullscreen',
    create: createFullscreenTemplate,
  },
  {
    type: 'starting-soon',
    name: 'Starting Soon',
    description: 'Pre-show holding graphic with event name and start time. Full-frame background with animated reveal.',
    category: 'Fullscreen',
    create: createStartingSoonTemplate,
  },
  {
    type: 'bug',
    name: 'Corner Bug',
    description: 'Persistent channel logo / badge in the top-right corner. Typically on-air throughout a broadcast.',
    category: 'Overlay',
    create: createBugTemplate,
  },
  {
    type: 'info-box',
    name: 'Info Box',
    description: 'Headline + body text box in the lower-right area. Good for facts, quotes, and supporting information.',
    category: 'Overlay',
    create: createInfoBoxTemplate,
  },
  {
    type: 'countdown',
    name: 'Countdown Timer',
    description: 'Live countdown from a set duration (in seconds). The timer runs in JavaScript — set duration via the Data panel.',
    category: 'General',
    create: createCountdownTemplate,
  },
  {
    type: 'scoreboard',
    name: 'Scoreboard',
    description: 'Two-team score display at the top of the frame. Slides down on play. Update scores live with the Update button.',
    category: 'Sport',
    create: createScoreboardTemplate,
  },
  {
    type: 'blank',
    name: 'Blank',
    description: 'Empty template with the correct structure and commented code. Start from scratch and build your own graphic.',
    category: 'General',
    create: createBlankTemplate,
  },
];

export { createLowerThirdTemplate, createFullscreenTemplate, createBugTemplate,
         createCountdownTemplate, createScoreboardTemplate, createInfoBoxTemplate,
         createStartingSoonTemplate, createBlankTemplate };
