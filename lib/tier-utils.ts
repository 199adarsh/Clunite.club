import { COLLEGES } from '@/lib/colleges';

export interface TierInfo {
  name: string;
  minXp: number;
  maxXp: number;
  badgeStyle: string;
}

export const TIERS: TierInfo[] = [
  {
    name: 'Explorer',
    minXp: 0,
    maxXp: 100,
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    name: 'Contender',
    minXp: 101,
    maxXp: 300,
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'Achiever',
    minXp: 301,
    maxXp: 600,
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    name: 'Innovator',
    minXp: 601,
    maxXp: 1200,
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    name: 'Champion',
    minXp: 1201,
    maxXp: 999999,
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export function getTier(xp: number): TierInfo {
  return TIERS.find((t) => xp >= t.minXp && xp <= t.maxXp) || TIERS[0];
}

export function getNextTier(xp: number): { nextTier: TierInfo | null; progressPercent: number; remainingXp: number } {
  const currentTierIndex = TIERS.findIndex((t) => xp >= t.minXp && xp <= t.maxXp);
  if (currentTierIndex === -1 || currentTierIndex === TIERS.length - 1) {
    return { nextTier: null, progressPercent: 100, remainingXp: 0 };
  }
  const currentTier = TIERS[currentTierIndex];
  const nextTier = TIERS[currentTierIndex + 1];
  const range = nextTier.minXp - currentTier.minXp;
  const progressInTier = Math.max(0, xp - currentTier.minXp);
  const progressPercent = Math.min(100, Math.round((progressInTier / range) * 100));
  const remainingXp = Math.max(0, nextTier.minXp - xp);
  return { nextTier, progressPercent, remainingXp };
}

export function normalizeCollegeName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();
  
  if (
    lower === 'unknown' ||
    lower === 'not specified' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'your college' ||
    trimmed === ''
  ) {
    return null;
  }

  if (lower.includes('dkte') || lower.includes('ichalkaranji') || lower.includes('dattajirao kadam')) {
    return "DKTE Society's Textile & Engineering Institute, Ichalkaranji";
  }

  const exactMatch = COLLEGES.find((c) => c.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch.name;

  if (trimmed === trimmed.toUpperCase() && trimmed.length > 5) {
    return trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return trimmed;
}

export function formatBranchName(rawBranch: string | null | undefined): string {
  if (!rawBranch) return 'General Engineering';
  const trimmed = rawBranch.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'aids' || lower === 'ai-ds' || lower === 'ai & ds') {
    return 'Artificial Intelligence & Data Science (AIDS)';
  }
  if (lower === 'aiml' || lower === 'ai-ml' || lower === 'ai & ml') {
    return 'CSE (AI & ML)';
  }
  if (lower === 'cse' || lower === 'computer science' || lower === 'cs' || lower === 'comps') {
    return 'Computer Science & Engineering';
  }
  if (lower === 'it' || lower === 'information technology') {
    return 'Information Technology';
  }
  if (lower === 'mech' || lower === 'mechanical') {
    return 'Mechanical Engineering';
  }
  if (lower === 'civil') {
    return 'Civil Engineering';
  }
  if (lower === 'ece' || lower === 'electronics') {
    return 'Electronics & Communication';
  }
  if (lower === 'textile') {
    return 'Textile Engineering';
  }
  if (lower === 'chemical') {
    return 'Chemical Engineering';
  }
  if (lower === 'electrical') {
    return 'Electrical Engineering';
  }
  return trimmed;
}
