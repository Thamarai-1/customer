import {
  LayoutDashboard,
  Users,
  PieChart,
  Megaphone,
  Gift,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  Send,
  BarChart3,
  FlaskConical,
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
    label: 'AI Generator',
    icon: Sparkles,
    path: '/ai-messages',
    description: 'Grounded email generation bounded by verified customer facts'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    path: '/compliance',
    description: 'Safety validations, tone checks, consent verification and refusal rules'
  },
  {
    id: 'approvals',
    label: 'Human Review',
    icon: CheckSquare,
    path: '/approvals',
    description: 'Human-in-the-loop review interface for generated drafts and evidence'
  },
  {
    id: 'deliveries',
    label: 'Deliveries',
    icon: Send,
    path: '/deliveries',
    description: 'Controlled mock and draft-only delivery tracking and idempotency logs'
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    icon: BarChart3,
    path: '/evaluation',
    description: 'Confusion matrix, accuracy metrics, latency stats and report export'
  },
  {
    id: 'demo',
    label: 'Demo Scenarios',
    icon: FlaskConical,
    path: '/demo',
    description: '5 Hackathon customer scenarios and mandatory refusal demonstrations'
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
