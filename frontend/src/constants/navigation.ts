import {
  LayoutDashboard,
  Users,
  PieChart,
  Megaphone,
  Gift,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  FileText,
  Settings,
  type LucideIcon
} from 'lucide-react';
import { NavItemKey } from '../types';

export interface NavItemConfig {
  id: NavItemKey;
  label: string;
  icon: LucideIcon;
  path: string;
  description: string;
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    description: 'Executive overview, customer health metrics and key system indicators'
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: '/customers',
    description: 'Customer profile assembly, loyalty indicators and activity tracking'
  },
  {
    id: 'segments',
    label: 'Segments',
    icon: PieChart,
    path: '/segments',
    description: 'Transparent behavioral classification with reason codes and confidence'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: Megaphone,
    path: '/campaigns',
    description: 'Policy-based strategy selection, tone guidelines and target audiences'
  },
  {
    id: 'offers',
    label: 'Offers',
    icon: Gift,
    path: '/offers',
    description: 'Approved reward catalogs, eligibility rules and discount terms'
  },
  {
    id: 'ai-messages',
    label: 'AI Message Generator',
    icon: Sparkles,
    path: '/ai-messages',
    description: 'Grounded email generation bounded by verified customer facts'
  },
  {
    id: 'approvals',
    label: 'Approval Queue',
    icon: CheckSquare,
    path: '/approvals',
    description: 'Human-in-the-loop review interface for generated drafts and evidence'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    path: '/compliance',
    description: 'Safety validations, tone checks, consent verification and refusal rules'
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: FileText,
    path: '/audit-logs',
    description: 'Observability timeline, model prompts, evidence trails and send statuses'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'Platform configurations, integration connections and user management'
  }
];
