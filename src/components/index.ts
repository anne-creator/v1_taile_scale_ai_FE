// Components index
// Organized by the layered architecture defined in code_principle.md
//
// Due to naming conflicts across levels (e.g., Pagination exists in both ui and custom),
// components should be imported from their specific level directory:
//
// Level 1:   import { Button, Input } from '@/components/ui';
// Level 2:   import { BorderBeam, Particles } from '@/components/animations';
// Level 2.5: import { Tabs, Dialog, Accordion } from '@/components/compound';
// Level 3:   import { SmartIcon, BrandLogo } from '@/components/custom';
// Level 4:   import { Hero } from '@/components/blocks/landing';
//
// This file provides namespace imports for convenience:

import * as ui from './ui';
import * as animations from './animations';
import * as compound from './compound';
import * as custom from './custom';

export { ui, animations, compound, custom };

// Level 4: Blocks should be imported from specific category
// import { Hero } from '@/components/blocks/landing';
