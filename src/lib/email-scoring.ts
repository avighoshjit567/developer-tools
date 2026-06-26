import type {
  EmailScoreBreakdown,
  EmailScoreItem,
  MxInfo,
  SpfInfo,
  DkimInfo,
  DmarcInfo,
  BlacklistInfo,
} from "@/types/email-scan";

interface EmailScoringInput {
  mx: MxInfo;
  spf: SpfInfo;
  dkim: DkimInfo;
  dmarc: DmarcInfo;
  blacklist: BlacklistInfo;
}

export function calculateEmailScore(data: EmailScoringInput): {
  score: number;
  grade: string;
  breakdown: EmailScoreBreakdown;
} {
  // MX Records: 20 points
  const mxItems: EmailScoreItem[] = [];

  const hasMx = data.mx.records.length > 0 ? 8 : 0;
  mxItems.push({ name: "Has MX Records", earned: hasMx, max: 8 });

  const hasBackup = data.mx.hasBackupMx ? 4 : 0;
  mxItems.push({ name: "Has Backup MX", earned: hasBackup, max: 4 });

  const mxResolvesCount = data.mx.records.filter((r) => r.ip !== null).length;
  const mxResolves = data.mx.records.length > 0 && mxResolvesCount > 0 ? 4 : 0;
  mxItems.push({ name: "MX Resolves to IP", earned: mxResolves, max: 4 });

  const hasInvalidMx = data.mx.records.some(
    (r) =>
      r.exchange === "localhost" ||
      r.exchange === "." ||
      r.exchange === "" ||
      (r.ip && (r.ip === "127.0.0.1" || r.ip === "0.0.0.0"))
  );
  const noInvalidMx = !hasInvalidMx && data.mx.records.length > 0 ? 4 : 0;
  mxItems.push({ name: "No Invalid MX", earned: noInvalidMx, max: 4 });

  const mxEarned = mxItems.reduce((s, i) => s + i.earned, 0);

  // SPF: 25 points
  const spfItems: EmailScoreItem[] = [];

  const spfExists = data.spf.exists ? 10 : 0;
  spfItems.push({ name: "SPF Record Exists", earned: spfExists, max: 10 });

  let spfStrictScore = 0;
  if (data.spf.mechanism === "-all") spfStrictScore = 8;
  else if (data.spf.mechanism === "~all") spfStrictScore = 4;
  else if (data.spf.mechanism === "?all") spfStrictScore = 0;
  else if (data.spf.mechanism === "+all") spfStrictScore = 0;
  spfItems.push({ name: "Strict SPF Policy", earned: spfStrictScore, max: 8 });

  const spfLookupValid = data.spf.exists && data.spf.lookupCount <= 10 ? 7 : 0;
  spfItems.push({ name: "Valid SPF Syntax", earned: spfLookupValid, max: 7 });

  const spfEarned = spfItems.reduce((s, i) => s + i.earned, 0);

  // DKIM: 20 points
  const dkimItems: EmailScoreItem[] = [];

  const dkimFound = data.dkim.found ? 12 : 0;
  dkimItems.push({ name: "DKIM Found", earned: dkimFound, max: 12 });

  let dkimMultiple = 0;
  if (data.dkim.activeCount >= 2) dkimMultiple = 8;
  else if (data.dkim.activeCount === 1) dkimMultiple = 4;
  dkimItems.push({ name: "Multiple Selectors", earned: dkimMultiple, max: 8 });

  const dkimEarned = dkimItems.reduce((s, i) => s + i.earned, 0);

  // DMARC: 25 points
  const dmarcItems: EmailScoreItem[] = [];

  const dmarcExists = data.dmarc.exists ? 8 : 0;
  dmarcItems.push({ name: "DMARC Record Exists", earned: dmarcExists, max: 8 });

  let dmarcPolicyScore = 0;
  if (data.dmarc.policy === "reject") dmarcPolicyScore = 8;
  else if (data.dmarc.policy === "quarantine") dmarcPolicyScore = 4;
  dmarcItems.push({ name: "DMARC Policy Strength", earned: dmarcPolicyScore, max: 8 });

  const dmarcReporting = data.dmarc.reportingEnabled ? 5 : 0;
  dmarcItems.push({ name: "DMARC Reporting (rua)", earned: dmarcReporting, max: 5 });

  const dmarcPct = data.dmarc.percentage === 100 ? 4 : 0;
  dmarcItems.push({ name: "DMARC Percentage 100%", earned: dmarcPct, max: 4 });

  const dmarcEarned = dmarcItems.reduce((s, i) => s + i.earned, 0);

  // Blacklist: 10 points
  const blacklistItems: EmailScoreItem[] = [];

  const blacklistPenalty = data.blacklist.blacklistedOn.length * 3;
  const blacklistScore = Math.max(0, 10 - blacklistPenalty);
  blacklistItems.push({ name: "Clean Blacklist Status", earned: blacklistScore, max: 10 });

  const blacklistEarned = blacklistItems.reduce((s, i) => s + i.earned, 0);

  const totalScore = mxEarned + spfEarned + dkimEarned + dmarcEarned + blacklistEarned;

  const hasCritical =
    !data.spf.exists || !data.dmarc.exists || !data.blacklist.clean;

  const grade = getGrade(totalScore, hasCritical);

  return {
    score: totalScore,
    grade,
    breakdown: {
      mx: { earned: mxEarned, max: 20, items: mxItems },
      spf: { earned: spfEarned, max: 25, items: spfItems },
      dkim: { earned: dkimEarned, max: 20, items: dkimItems },
      dmarc: { earned: dmarcEarned, max: 25, items: dmarcItems },
      blacklist: { earned: blacklistEarned, max: 10, items: blacklistItems },
    },
  };
}

function getGrade(score: number, hasCritical: boolean): string {
  if (score >= 95 && !hasCritical) return "A+";
  if (score >= 90 && !hasCritical) return "A";
  if (score >= 85 && !hasCritical) return "A-";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "B-";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}
