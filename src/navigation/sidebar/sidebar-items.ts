import {
  ShoppingBag,
  Forklift,
  Mail,
  Bell,
  MessageSquare,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Settings as SettingsIcon,
  Activity,
  Archive,
  ListChecks,
  Tags,
  BadgePercent,
  Undo2,
  RotateCcw,
  Image as ImageIcon,
  Shield,
  FileText,
  type LucideIcon,
} from "lucide-react";


export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  iconClassName?: string;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  permission?: string;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  iconClassName?: string;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  permission?: string;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Default",
        url: "/dashboard/default",
        icon: LayoutDashboard,
        iconClassName: "text-blue-500",
        permission: "dashboard.view",
      },
    ],
  },
  {
    id: 2,
    label: "Commerce",
    items: [
      { title: "Products", url: "/dashboard/products", icon: ShoppingBag, iconClassName: "text-purple-500", permission: "products.view" },
      { title: "Categories", url: "/dashboard/categories", icon: Tags, iconClassName: "text-emerald-500", permission: "categories.view" },
      { title: "Orders", url: "/dashboard/orders", icon: ReceiptText, iconClassName: "text-sky-500", permission: "orders.view" },
      { title: "Refunds", url: "/dashboard/refunds", icon: Undo2, iconClassName: "text-rose-500", permission: "refunds.view" },
      { title: "Returns", url: "/dashboard/returns", icon: RotateCcw, iconClassName: "text-orange-500", permission: "returns.view" },
      { title: "Customers", url: "/dashboard/customers", icon: Users, iconClassName: "text-cyan-500", permission: "customers.view" },
      { title: "Reviews", url: "/dashboard/reviews", icon: MessageSquare, iconClassName: "text-amber-500", permission: "reviews.view" },
      { title: "Discounts", url: "/dashboard/discounts", icon: BadgePercent, iconClassName: "text-fuchsia-500", permission: "discounts.view" },
      { title: "Shipping Methods", url: "/dashboard/shipping/methods", icon: Forklift, iconClassName: "text-lime-500", permission: "shipping.view" },
      { title: "Shipments", url: "/dashboard/shipping/shipments", icon: Forklift, iconClassName: "text-indigo-500", permission: "shipping.view" },
    ],
  },
  {
    id: 3,
    label: "Communication",
    items: [
      { title: "Notifications", url: "/dashboard/notifications", icon: Bell, iconClassName: "text-amber-500", permission: "notifications.view" },
      { title: "Newsletter", url: "/dashboard/marketing/newsletter", icon: Mail, iconClassName: "text-pink-500", permission: "newsletter.view" },
      { title: "Email Templates", url: "/dashboard/emails/templates", icon: Mail, iconClassName: "text-pink-500", permission: "emails.view" },
      { title: "Email Logs", url: "/dashboard/emails/logs", icon: ReceiptText, iconClassName: "text-pink-600", permission: "emails.view" },
    ],
  },
  {
    id: 6,
    label: "Support",
    items: [
      {
        title: "Messages",
        url: "/dashboard/support/messages",
        icon: MessageSquare,
        iconClassName: "text-amber-600",
        permission: "support.view",
        subItems: [
          { title: "Inbox", url: "/dashboard/support/messages", permission: "support.view" },
          { title: "Reports", url: "/dashboard/support/messages/reports", permission: "support.view" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Access Control",
    items: [
      { title: "Users", url: "/dashboard/users", icon: Users, iconClassName: "text-teal-500", permission: "users.view" },
      { title: "Roles", url: "/dashboard/roles", icon: Lock, iconClassName: "text-violet-500", permission: "roles.view" },
      { title: "Permissions", url: "/dashboard/permissions", icon: Fingerprint, iconClassName: "text-rose-500", permission: "permissions.view" },
    ],
  },
  {
    id: 5,
    label: "System",
    items: [
      { title: "Settings", url: "/dashboard/settings", icon: SettingsIcon, iconClassName: "text-slate-500", permission: "settings.view" },
      { title: "Security", url: "/dashboard/security", icon: Shield, iconClassName: "text-red-500", permission: "security.view" },
      { title: "Audit Logs", url: "/dashboard/audit-logs", icon: ListChecks, iconClassName: "text-orange-500", permission: "audit.view" },
      { title: "System Logs", url: "/dashboard/system/logs", icon: FileText, iconClassName: "text-slate-600", permission: "system.logs.view" },
      { title: "Backups", url: "/dashboard/backups", icon: Archive, iconClassName: "text-stone-500", permission: "backups.view" },
      { title: "Health", url: "/dashboard/health", icon: Activity, iconClassName: "text-green-500", permission: "health.view" },
      { title: "Metrics", url: "/dashboard/system/metrics", icon: ChartBar, iconClassName: "text-blue-600", permission: "system.metrics.view" },
    ],
  },
];
