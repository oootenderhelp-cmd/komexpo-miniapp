import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, MessageSquare, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: Number(id) });
  const { data: responses } = trpc.projects.responses.useQuery({ projectId: Number(id) });
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");

  const respond = trpc.projects.respond.useMutation({
    onSuccess: () => { toast.success("Отклик отправлен!"); setMessage(""); setPrice(""); setDays(""); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Layout><div className="container py-16 text-center">Загрузка...</div></Layout>;
  if (!project) return <Layout><div className="container py-16 text-center">Проект не найден</div></Layout>;

  return (
    <Layout>
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Badge variant={project.status === 'open' ? 'default' : 'secondary'} className="mb-3">
                {project.status === 'open' ? 'Открыт' : 'В работе'}
              </Badge>
              <h1 className="text-2xl font-bold mb-3">{project.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {project.budget && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{Number(project.budget).toLocaleString('ru-RU')} ₽</span>}
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{project.responseCount} откликов</span>
              </div>
            </div>
            <Separator />
            <div>
              <h2 className="font-semibold mb-3">Описание проекта</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>

            {/* Responses */}
            <div>
              <h2 className="font-semibold mb-4">Отклики ({responses?.length || 0})</h2>
              <div className="space-y-3">
                {responses?.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                        <span className="text-sm font-medium">Подрядчик #{r.userId}</span>
                        <Badge variant="outline" className="ml-auto">{Number(r.proposedPrice).toLocaleString('ru-RU')} ₽ / {r.proposedDays} дн.</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Respond form */}
          <div>
            <Card className="sticky top-20">
              <CardHeader><CardTitle className="text-lg">Откликнуться</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Ваше предложение (мин. 10 символов)" value={message} onChange={e => setMessage(e.target.value)} rows={4} />
                <Input placeholder="Ваша цена (₽)" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                <Input placeholder="Срок (дней)" type="number" value={days} onChange={e => setDays(e.target.value)} />
                <Button className="w-full" onClick={() => {
                  if (!isAuthenticated) { startLogin(); return; }
                  respond.mutate({ projectId: Number(id), message, proposedPrice: Number(price), proposedDays: Number(days) });
                }} disabled={respond.isPending}>
                  Отправить отклик
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
