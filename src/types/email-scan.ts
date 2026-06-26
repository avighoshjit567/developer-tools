export interface EmailScanResult {
  uuid: string;
  domain: string;
  score: number;
  grade: string;
  scanDate: string;
  duration: number;
  quickFacts: EmailQuickFacts;
  issues: EmailIssue[];
  whatToFix: EmailFixItem[];
  mx: MxInfo;
  spf: SpfInfo;
  dkim: DkimInfo;
  dmarc: DmarcInfo;
  blacklist: BlacklistInfo;
  breakdown: EmailScoreBreakdown;
}

export interface EmailQuickFacts {
  mailServer: string;
  mailProvider: string;
  spfStatus: string;
  dkimStatus: string;
  dmarcPolicy: string;
  blacklistStatus: string;
  mxCount: number;
  tlsSupport: string;
}

export interface EmailIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category: string;
}

export interface EmailFixItem {
  priority: number;
  title: string;
  description: string;
}

export interface MxInfo {
  records: { priority: number; exchange: string; ip: string | null }[];
  hasBackupMx: boolean;
  provider: string;
}

export interface SpfInfo {
  exists: boolean;
  record: string | null;
  mechanism: string | null;
  isStrict: boolean;
  includes: string[];
  lookupCount: number;
  status: "pass" | "softfail" | "neutral" | "fail" | "missing";
}

export interface DkimInfo {
  found: boolean;
  selectors: { name: string; found: boolean }[];
  activeCount: number;
}

export interface DmarcInfo {
  exists: boolean;
  record: string | null;
  policy: string | null;
  subdomainPolicy: string | null;
  reportingEnabled: boolean;
  ruaEmails: string[];
  rufEmails: string[];
  percentage: number;
  status: "reject" | "quarantine" | "none" | "missing";
}

export interface BlacklistInfo {
  clean: boolean;
  listsChecked: number;
  blacklistedOn: string[];
  ipChecked: string;
}

export interface EmailScoreBreakdown {
  mx: { earned: number; max: number; items: EmailScoreItem[] };
  spf: { earned: number; max: number; items: EmailScoreItem[] };
  dkim: { earned: number; max: number; items: EmailScoreItem[] };
  dmarc: { earned: number; max: number; items: EmailScoreItem[] };
  blacklist: { earned: number; max: number; items: EmailScoreItem[] };
}

export interface EmailScoreItem {
  name: string;
  earned: number;
  max: number;
}

export interface EmailScanProgress {
  check: string;
  label: string;
  progress: number;
  total: number;
}
