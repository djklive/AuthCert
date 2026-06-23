export type UserType = 'student' | 'establishment' | 'admin';

export type Screen = 
  | 'dashboard'
  | 'establishments'
  | 'users'
  | 'subscriptions'
  | 'reports'
  | 'settings'
  | 'notifications';

export type NavigateFunction = (screen: Screen | string) => void;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserType;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastLogin?: string;
}

export interface Establishment {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'rejected';
  submittedAt: string;
  documents: Document[];
  contactPerson: string;
  phone: string;
  address: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'business_license' | 'tax_certificate' | 'identity_proof' | 'other';
  url: string;
  uploadedAt: string;
}

export interface Subscription {
  id: string;
  plan: 'basic' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
}

export interface KPI {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export type ChangeType = 'increase' | 'decrease' | 'neutral';

export interface AdminKpi {
  value: number;
  change: number;
  changeType: ChangeType;
}

export interface AdminActivityItem {
  id: string;
  action: string;
  description: string;
  date: string;
  user: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timeAgo: string;
}

export interface AdminStats {
  kpis: {
    etablissements: AdminKpi;
    apprenants: AdminKpi;
    certificats: AdminKpi;
    verifications: AdminKpi;
  };
  priorityActions: {
    pendingEstablishments: number;
    failedPayments: number;
  };
  recentActivity: AdminActivityItem[];
  period: {
    days: number;
    newEstablishments: number;
    newCertificates: number;
    newVerifications: number;
  };
}

export interface AdminNotification {
  id: number;
  userId: number;
  userType: string;
  type: string;
  titre: string;
  message: string;
  lu: boolean;
  important: boolean;
  lienAction: string | null;
  metadonnees: unknown;
  createdAt: string;
  readAt: string | null;
}

export interface AdminSettings {
  emailAlerts: boolean;
  pushNotifications: boolean;
  autoReports: boolean;
  language: 'fr' | 'en';
  theme: 'light' | 'dark';
}

export interface AdminSession {
  id: number;
  device: string;
  location: string;
  lastActive: string;
  type: 'desktop' | 'mobile';
  current: boolean;
  expiresAt: string;
}
