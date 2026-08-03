import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, MessageSquare, Star, CheckCircle } from "lucide-react";

interface UserStatsProps {
  completedOrders?: number;
  totalReviews?: number;
  averageRating?: number;
  responseTime?: string;
}

export default function UserStats({
  completedOrders = 0,
  totalReviews = 0,
  averageRating = 0,
  responseTime = "< 1 часа",
}: UserStatsProps) {
  const stats = [
    {
      icon: CheckCircle,
      label: "Выполнено заказов",
      value: completedOrders,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Star,
      label: "Средний рейтинг",
      value: averageRating.toFixed(1),
      unit: "/ 5",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      icon: MessageSquare,
      label: "Отзывов",
      value: totalReviews,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      label: "Время ответа",
      value: responseTime,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-bold">
                {stat.value}
                {stat.unit && <span className="text-sm text-muted-foreground">{stat.unit}</span>}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
