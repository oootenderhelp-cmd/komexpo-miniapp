import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Clock, DollarSign, MapPin, User } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface ProjectCardProps {
  id: number;
  title: string;
  description: string;
  budget: number;
  deadline?: string;
  category?: string;
  status: string;
  clientName?: string;
  responses?: number;
}

export default function ProjectCard({
  id,
  title,
  description,
  budget,
  deadline,
  category,
  status,
  clientName,
  responses = 0,
}: ProjectCardProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return "Не указано";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU");
  };

  return (
    <Link href={`/projects/${id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-2 flex-1">{title}</h3>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-600">{budget.toLocaleString("ru-RU")} ₽</span>
            </div>
            {deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{formatDate(deadline)}</span>
              </div>
            )}
            {clientName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-600" />
                <span>{clientName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            {category && <Badge variant="secondary" className="text-xs">{category}</Badge>}
            {responses > 0 && (
              <span className="text-xs text-muted-foreground">{responses} откликов</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
