import { LucideIcon } from "lucide-react";

export type LeadStatus = "hot" | "warm" | "cold" | "converted" | "lost";
export type LeadSource = "WhatsApp" | "Instagram" | "Facebook" | "Website" | "Referral" | string;

export interface Lead {
  name: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  lastContact: string;
  avatar: string;
}

export interface HotLead {
  name: string;
  interest: string;
  value: string;
  score: number;
  avatar: string;
  time: string;
}

export interface AnalyticsCard {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  borderColor: string;
}

export interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: string;
  href?: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  dot: string;
}