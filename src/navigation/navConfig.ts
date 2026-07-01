import type { MainTabParamList } from './types';
import {
  IconDashboard,
  IconAthletes,
  IconPrograms,
  IconSession,
  IconMessages,
  IconNotes,
  IconReports,
  IconExercises,
  IconProfile,
  IconScreening,
  IconMore,
} from '../components/ui/icons';

export type NavItem = {
  name: keyof MainTabParamList;
  label: string;
  shortLabel?: string;
  section?: 'main' | 'training' | 'communicate' | 'analytics' | 'footer';
  showInBottomNav?: boolean;
  Icon: typeof IconDashboard;
};

export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', label: 'Dashboard', shortLabel: 'Hem', section: 'main', showInBottomNav: true, Icon: IconDashboard },
  { name: 'Athletes', label: 'Athletprofil', shortLabel: 'Atleter', section: 'main', showInBottomNav: false, Icon: IconAthletes },
  { name: 'Programs', label: 'Adapt Program', section: 'training', Icon: IconPrograms },
  { name: 'Sessions', label: 'Sessioner', shortLabel: 'Sessioner', section: 'training', showInBottomNav: true, Icon: IconSession },
  { name: 'Exercises', label: 'Övningsbibliotek', section: 'training', Icon: IconExercises },
  { name: 'Messages', label: 'Meddelanden', shortLabel: 'Chatt', section: 'communicate', showInBottomNav: true, Icon: IconMessages },
  { name: 'Broadcast', label: 'Broadcast', section: 'communicate', Icon: IconMessages },
  { name: 'Notes', label: 'Anteckningar', section: 'communicate', Icon: IconNotes },
  { name: 'Reports', label: 'Rapporter', shortLabel: 'Rapport', section: 'analytics', showInBottomNav: false, Icon: IconReports },
  { name: 'Screening', label: 'Screening', shortLabel: 'Screening', section: 'analytics', showInBottomNav: true, Icon: IconScreening },
  { name: 'Profile', label: 'Profil', shortLabel: 'Profil', section: 'footer', showInBottomNav: true, Icon: IconProfile },
];

export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((i) => i.showInBottomNav);

/** Overflow items for tablet/desktop sidebar only */
export const MORE_NAV_ITEMS = NAV_ITEMS.filter(
  (i) => !i.showInBottomNav && i.name !== 'Profile'
);
