export interface ScanResult {
  uuid: string;
  domain: string;
  score: number;
  grade: string;
  scanDate: string;
  duration: number;
  quickFacts: QuickFacts;
  issues: Issue[];
  whatToFix: FixItem[];
  registration: RegistrationInfo;
  dns: DnsInfo;
  integrity: IntegrityInfo;
  audit: AuditCategories;
  breakdown: ScoreBreakdown;
}

export interface QuickFacts {
  registrar: string;
  nsProvider: string;
  ipAddress: string;
  mail: string;
  dmarc: string;
  expires: string;
  domainAge: string;
  hosting: string;
  sslExpires: string;
  platform: string;
}

export interface Issue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category: string;
}

export interface FixItem {
  priority: number;
  title: string;
  description: string;
}

export interface RegistrationInfo {
  registrar: string;
  expiry: string;
  expiryDaysRemaining: number | null;
  domainAge: string;
}

export interface DnsInfo {
  nameservers: { host: string; type: string }[];
  nsProvider: string;
  host: string;
  records: {
    mx: boolean;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    caa: boolean;
  };
  subdomains: { name: string; hasSPF: boolean }[];
}

export interface IntegrityInfo {
  sslCertificate: "Active" | "Expired" | "None";
  sslIssuer: string;
  dnssec: "Enabled" | "Disabled";
  hsts: "Enabled" | "Missing";
  securityHeaders: string;
}

export interface AuditItem {
  title: string;
  detail: string;
  status: "verified" | "info" | "attention" | "issue";
  children?: AuditItem[];
}

export interface AuditCategories {
  registration: AuditItem[];
  dns: AuditItem[];
  hosting: AuditItem[];
  security: AuditItem[];
}

export interface ScoreBreakdown {
  registration: { earned: number; max: number; items: ScoreItem[] };
  dns: { earned: number; max: number; items: ScoreItem[] };
  hosting: { earned: number; max: number; items: ScoreItem[] };
  security: { earned: number; max: number; items: ScoreItem[] };
}

export interface ScoreItem {
  name: string;
  earned: number;
  max: number;
}

export interface ScanProgress {
  check: string;
  label: string;
  progress: number;
  total: number;
}
