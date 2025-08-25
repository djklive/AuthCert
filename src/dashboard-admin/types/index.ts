export type UserType = 'student' | 'establishment' | 'admin';

export type Screen = 
  | 'dashboard'
  | 'establishments'
  | 'users'
  | 'subscriptions'
  | 'reports'
  | 'settings';

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
