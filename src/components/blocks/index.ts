// Level 4: Blocks
// 
// Due to naming conflicts across block categories (e.g., Header exists in both landing and dashboard),
// blocks should be imported from their specific category directory:
//
// import { Hero, Header, Footer } from '@/components/blocks/landing';
// import { Sidebar, Header as DashboardHeader } from '@/components/blocks/dashboard';
// import { ChatBox } from '@/components/blocks/chat';
//
// This file provides namespace imports for convenience:

import * as landing from './landing';
import * as dashboard from './dashboard';
import * as chat from './chat';
import * as auth from './auth';
import * as form from './form';
import * as table from './table';
import * as panel from './panel';
import * as generator from './generator';
import * as email from './email';
import * as payment from './payment';
import * as console from './console';
import * as common from './common';

export { landing, dashboard, chat, auth, form, table, panel, generator, email, payment, console, common };
