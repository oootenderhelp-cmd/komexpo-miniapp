import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Users, Package, AlertTriangle, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const isAllowed = isAuthenticated && (user?.role === 'admin' || (user?.role as string) === 'owner');

  const { data: usersData } = trpc.admin.users.useQuery({}, { enabled: isAllowed });
  const { data: kvorkiData } = trpc.admin.kvorki.useQuery({}, { enabled: isAllowed });
  const { data: disputes } = trpc.admin.disputes.useQuery({}, { enabled: isAllowed });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Роль обновлена"); utils.admin.users.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const moderateKvorka = trpc.admin.moderateKvorka.useMutation({
    onSuccess: () => { toast.success("Статус кворки обновлён"); utils.admin.kvorki.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resolveDispute = trpc.admin.resolveDispute.useMutation({
    onSuccess: () => { toast.success("Спор разрешён"); utils.admin.disputes.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [disputeResolution, setDisputeResolution] = useState("");
  const [disputeStatus, setDisputeStatus] = useState<string>("resolved_customer");

  useEffect(() => {
    if (!loading && !isAllowed) navigate("/");
  }, [loading, isAllowed, navigate]);

  if (loading || !isAllowed) {
    return <Layout><div className="container py-16 text-center"><p className="text-muted-foreground">Загрузка...</p></div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Панель администратора</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Пользователей</p><p className="text-3xl font-bold">{usersData?.total || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Кворок</p><p className="text-3xl font-bold">{kvorkiData?.total || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Споров</p><p className="text-3xl font-bold text-destructive">{disputes?.length || 0}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-1"><Users className="w-4 h-4" />Пользователи</TabsTrigger>
            <TabsTrigger value="kvorki" className="gap-1"><Package className="w-4 h-4" />Модерация</TabsTrigger>
            <TabsTrigger value="disputes" className="gap-1"><AlertTriangle className="w-4 h-4" />Споры</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="space-y-2">
              {usersData?.items.map(u => (
                <Card key={u.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.name || 'Без имени'}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · ID: {u.id} · {new Date(u.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'admin' ? 'default' : u.role === 'owner' ? 'destructive' : 'secondary'}>{u.role}</Badge>
                      {u.role !== 'owner' && (
                        <Select value={u.role} onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as any })}>
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kvorki">
            <div className="space-y-2">
              {kvorkiData?.items.map(k => (
                <Card key={k.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{k.title}</p>
                      <p className="text-xs text-muted-foreground">{Number(k.price).toLocaleString('ru-RU')} ₽ · Автор #{k.userId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={k.status === 'active' ? 'default' : k.status === 'rejected' ? 'destructive' : 'outline'}>{k.status}</Badge>
                      {k.status !== 'active' && (
                        <Button size="sm" variant="default" onClick={() => moderateKvorka.mutate({ id: k.id, status: 'active' })}>Одобрить</Button>
                      )}
                      {k.status === 'active' && (
                        <Button size="sm" variant="destructive" onClick={() => moderateKvorka.mutate({ id: k.id, status: 'rejected' })}>Отклонить</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="disputes">
            {disputes?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Нет открытых споров</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {disputes?.map(d => (
                  <Card key={d.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">Спор по заказу #{d.orderId}</p>
                          <p className="text-xs text-muted-foreground mt-1">Инициатор: #{d.initiatorId}</p>
                          <p className="text-sm mt-2">{d.reason}</p>
                        </div>
                        <Badge variant={d.status === 'open' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                      </div>
                      {d.status === 'open' && (
                        <div className="border-t pt-3 mt-3 space-y-3">
                          <Textarea placeholder="Решение по спору..." value={disputeResolution} onChange={e => setDisputeResolution(e.target.value)} rows={2} />
                          <div className="flex items-center gap-2">
                            <Select value={disputeStatus} onValueChange={setDisputeStatus}>
                              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="resolved_customer">В пользу заказчика</SelectItem>
                                <SelectItem value="resolved_contractor">В пользу подрядчика</SelectItem>
                                <SelectItem value="closed">Закрыть</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => resolveDispute.mutate({ id: d.id, resolution: disputeResolution, status: disputeStatus as any })} disabled={!disputeResolution}>Решить</Button>
                          </div>
                        </div>
                      )}
                      {d.resolution && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-muted-foreground">Решение:</p>
                          <p className="text-sm">{d.resolution}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
