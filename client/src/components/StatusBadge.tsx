import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export default function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: any; color: string }> = {
    open: { label: "Открыт", variant: "default", color: "bg-blue-100 text-blue-800" },
    in_progress: { label: "В работе", variant: "secondary", color: "bg-yellow-100 text-yellow-800" },
    completed: { label: "Завершён", variant: "default", color: "bg-green-100 text-green-800" },
    cancelled: { label: "Отменён", variant: "destructive", color: "bg-red-100 text-red-800" },
    disputed: { label: "В споре", variant: "destructive", color: "bg-orange-100 text-orange-800" },
    pending: { label: "Ожидание", variant: "outline", color: "bg-gray-100 text-gray-800" },
    active: { label: "Активен", variant: "default", color: "bg-green-100 text-green-800" },
    inactive: { label: "Неактивен", variant: "outline", color: "bg-gray-100 text-gray-800" },
    freelancer: { label: "Фрилансер", variant: "secondary", color: "bg-blue-100 text-blue-800" },
    agency: { label: "Агентство", variant: "secondary", color: "bg-purple-100 text-purple-800" },
    employee: { label: "Сотрудник", variant: "secondary", color: "bg-indigo-100 text-indigo-800" },
  };

  const config = statusConfig[status] || { label: status, variant: "default", color: "bg-gray-100 text-gray-800" };

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
