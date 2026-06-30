// HR Analysis Engine

export interface AnalysisResult {
  overview: OverviewMetrics;
  talentStructure: TalentStructure;
  turnover: TurnoverAnalysis;
  orgEffectiveness: OrgEffectiveness;
}

export interface OverviewMetrics {
  totalEmployees: number;
  departmentCount: number;
  avgTenure: number; // years
  avgAge: number;
  genderRatio: { male: number; female: number; other: number };
  turnoverRate: number; // annualized
}

export interface TalentStructure {
  byDepartment: BarData[];
  byLevel: BarData[];
  byEducation: BarData[];
  byGender: PieData[];
  ageDistribution: BarData[];
  tenureDistribution: BarData[];
  zodiacDistribution: BarData[];
}

export interface TurnoverAnalysis {
  monthlyHires: LineData[];
  monthlyLeaves: LineData[];
  turnoverByDept: BarData[];
  voluntaryVsInvoluntary: PieData[];
}

export interface OrgEffectiveness {
  spanOfControl: BarData[]; // avg reports per manager
  keyPositionCoverage: PieData[];
  hcUtilization: BarData[];
}

interface BarData { name: string; value: number; }
interface PieData { name: string; value: number; }
interface LineData { name: string; value: number; }

export function analyze(
  data: Record<string, any>[],
  fieldMap: Record<string, string>
): AnalysisResult {
  if (!data.length) return emptyResult();

  // Normalize fields using field map
  const f = (cat: string) => fieldMap[cat] || cat;

  // Overview
  const total = data.length;
  const depts = new Set(data.map((r) => r[f('department')]).filter(Boolean));
  const tenures = data.map((r) => calcTenure(r[f('hireDate')], r[f('leaveDate')])).filter((t) => t >= 0);
  const ages = data.map((r) => calcAge(r[f('birthDate')])).filter((a) => a > 0);

  const overview: OverviewMetrics = {
    totalEmployees: total,
    departmentCount: depts.size,
    avgTenure: avg(tenures),
    avgAge: avg(ages),
    genderRatio: countGender(data, f('gender')),
    turnoverRate: calcTurnoverRate(data, f('hireDate'), f('leaveDate')),
  };

  // Talent Structure
  const talentStructure: TalentStructure = {
    byDepartment: topN(groupBy(data, f('department')), 10),
    byLevel: groupBy(data, f('level')),
    byEducation: groupBy(data, f('education')),
    byGender: toPie(groupBy(data, f('gender'))),
    ageDistribution: ageGroups(ages),
    tenureDistribution: tenureGroups(tenures),
    zodiacDistribution: zodiacCount(data, f('birthDate')),
  };

  // Turnover
  const hiresByMonth = groupByMonth(data, f('hireDate'));
  const leavesByMonth = groupByMonth(data, f('leaveDate'));

  const turnover: TurnoverAnalysis = {
    monthlyHires: hiresByMonth,
    monthlyLeaves: leavesByMonth,
    turnoverByDept: topN(
      groupBy(
        data.filter((r) => r[f('leaveDate')]),
        f('department')
      ),
      10
    ),
    voluntaryVsInvoluntary: toPie(
      groupBy(
        data.filter((r) => r[f('leaveDate')]),
        f('type')
      )
    ),
  };

  // Org Effectiveness
  const managers = data.filter((r) => r[f('manager')]);
  const spanByDept: Record<string, number[]> = {};
  for (const r of data) {
    const dept = r[f('department')] || '未知';
    if (!spanByDept[dept]) spanByDept[dept] = [];
  }

  const orgEffectiveness: OrgEffectiveness = {
    spanOfControl: topN(groupBy(managers, f('department')), 8),
    keyPositionCoverage: [
      { name: '在岗', value: data.filter((r) => !r[f('leaveDate')]).length },
      { name: '空缺', value: Math.max(0, total * 0.05) },
    ],
    hcUtilization: topN(groupBy(data.filter((r) => !r[f('leaveDate')]), f('department')), 8),
  };

  return { overview, talentStructure, turnover, orgEffectiveness };
}

// Utility functions
function groupBy(data: Record<string, any>[], field: string): BarData[] {
  const counts: Record<string, number> = {};
  for (const r of data) {
    const key = r[field] || '未知';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function topN(items: BarData[], n: number): BarData[] {
  return items.slice(0, n);
}

function toPie(items: BarData[]): PieData[] {
  return items;
}

function groupByMonth(data: Record<string, any>[], field: string): LineData[] {
  const months: Record<string, number> = {};
  for (const r of data) {
    const v = r[field];
    if (!v) continue;
    const d = new Date(v);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + 1;
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }));
}

function calcTenure(hireDate: string | null, leaveDate?: string | null): number {
  if (!hireDate) return -1;
  const h = new Date(hireDate);
  const l = leaveDate ? new Date(leaveDate) : new Date();
  if (isNaN(h.getTime()) || isNaN(l.getTime())) return -1;
  return (l.getTime() - h.getTime()) / (365.25 * 86400 * 1000);
}

function calcAge(birth: string | null): number {
  if (!birth) return -1;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function countGender(data: Record<string, any>[], field: string) {
  let male = 0, female = 0, other = 0;
  for (const r of data) {
    const v = String(r[field] || '').trim();
    if (/^男|^m/i.test(v)) male++;
    else if (/^女|^f/i.test(v)) female++;
    else other++;
  }
  return { male, female, other };
}

function calcTurnoverRate(data: Record<string, any>[], hireField: string, leaveField: string): number {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const leavesThisYear = data.filter((r) => {
    const lv = r[leaveField];
    return lv && new Date(lv) >= yearStart;
  }).length;
  const avgHeadcount = (data.filter((r) => !r[leaveField] || new Date(r[leaveField]) >= yearStart).length + data.length) / 2;
  return avgHeadcount > 0 ? Math.round((leavesThisYear / avgHeadcount) * 1000) / 10 : 0;
}

function ageGroups(ages: number[]): BarData[] {
  const groups: Record<string, number> = { '<25': 0, '25-30': 0, '30-35': 0, '35-40': 0, '40-45': 0, '45+': 0 };
  for (const a of ages) {
    if (a < 25) groups['<25']++;
    else if (a < 30) groups['25-30']++;
    else if (a < 35) groups['30-35']++;
    else if (a < 40) groups['35-40']++;
    else if (a < 45) groups['40-45']++;
    else groups['45+']++;
  }
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

function tenureGroups(tenures: number[]): BarData[] {
  const groups: Record<string, number> = { '<1年': 0, '1-3年': 0, '3-5年': 0, '5-10年': 0, '10年+': 0 };
  for (const t of tenures) {
    if (t < 1) groups['<1年']++;
    else if (t < 3) groups['1-3年']++;
    else if (t < 5) groups['3-5年']++;
    else if (t < 10) groups['5-10年']++;
    else groups['10年+']++;
  }
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

// Zodiac/constellation detection by birth month & day
const ZODIAC = [
  { name: '摩羯座', emoji: '♑', start: [1, 1], end: [1, 19] },
  { name: '水瓶座', emoji: '♒', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', emoji: '♓', start: [2, 19], end: [3, 20] },
  { name: '白羊座', emoji: '♈', start: [3, 21], end: [4, 19] },
  { name: '金牛座', emoji: '♉', start: [4, 20], end: [5, 20] },
  { name: '双子座', emoji: '♊', start: [5, 21], end: [6, 21] },
  { name: '巨蟹座', emoji: '♋', start: [6, 22], end: [7, 22] },
  { name: '狮子座', emoji: '♌', start: [7, 23], end: [8, 22] },
  { name: '处女座', emoji: '♍', start: [8, 23], end: [9, 22] },
  { name: '天秤座', emoji: '♎', start: [9, 23], end: [10, 23] },
  { name: '天蝎座', emoji: '♏', start: [10, 24], end: [11, 22] },
  { name: '射手座', emoji: '♐', start: [11, 23], end: [12, 21] },
  { name: '摩羯座', emoji: '♑', start: [12, 22], end: [12, 31] },
];

export function getZodiacSign(birthDate: string | null): { name: string; emoji: string } | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const z of ZODIAC) {
    if (
      (month === z.start[0] && day >= z.start[1]) ||
      (month === z.end[0] && day <= z.end[1])
    ) {
      return { name: z.name, emoji: z.emoji };
    }
  }
  return null;
}

function zodiacCount(data: Record<string, any>[], birthField: string): BarData[] {
  const counts: Record<string, number> = {};
  for (const r of data) {
    const sign = getZodiacSign(r[birthField]);
    if (sign) {
      const label = `${sign.emoji} ${sign.name}`;
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  // Sort by zodiac order
  const order = ['♑ 摩羯座', '♒ 水瓶座', '♓ 双鱼座', '♈ 白羊座', '♉ 金牛座', '♊ 双子座', '♋ 巨蟹座', '♌ 狮子座', '♍ 处女座', '♎ 天秤座', '♏ 天蝎座', '♐ 射手座'];
  return order
    .filter((k) => counts[k])
    .map((k) => ({ name: k, value: counts[k] }));
}

function emptyResult(): AnalysisResult {
  const empty = { overview: {} as any, talentStructure: {} as any, turnover: {} as any, orgEffectiveness: {} as any };
  return empty;
}
