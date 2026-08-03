import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { DollarSign, Users, ShoppingCart, Package, FolderOpen, TrendingUp, Crown, Settings } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function OwnerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const isOwner = isAuthenticated && (user?.role as string) === 'owner';

  const { data: stats, isLoading } = trpc.owner.stats.useQuery(undefined, { enabled: isOwner });
  const { data: allUsersData } = trpc.owner.allUsers.useQuery(undefined, { enabled: isOwner });

  const setRole = trpc.owner.setRole.useMutation({
    onSuccess: () => { toast.success("Роль обновлена"); utils.owner.allUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !isOwner) navigate("/");
  }, [loading, isOwner, navigate]);

  if (loading || !isOwner) {
    return <Layout><div className="container py-16 text-center"><p className="text-muted-foreground">Загрузка...</p></div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-7 h-7 text-yellow-500" />
          <h1 className="text-2xl font-bold">Дашборд владельца</h1>
        </div>
        <p className="text-muted-foreground mb-8">Полная статистика и управление платформой Komexpo Work</p>

        <Tabs defaultValue="stats">
          <TabsList className="mb-6">
            <TabsTrigger value="stats" className="gap-1"><TrendingUp className="w-4 h-4" />Статистика</TabsTrigger>
            <TabsTrigger value="access" className="gap-1"><Settings className="w-4 h-4" />Управление доступами</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-muted-foreground">Всего пользователей</p><p className="text-3xl font-bold mt-1">{stats?.totalUsers || 0}</p></div>
                      <Users className="w-8 h-8 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-muted-foreground">Оборот платформы</p><p className="text-3xl font-bold mt-1">{Number(stats?.totalTurnover || 0).toLocaleString('ru-RU')} ₽</p></div>
                      <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-muted-foreground">Всего заказов</p><p className="text-3xl font-bold mt-1">{stats?.totalOrders || 0}</p></div>
                      <ShoppingCart className="w-8 h-8 text-orange-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-cyan-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-muted-foreground">Активных кворок</p><p className="text-3xl font-bold mt-1">{stats?.activeKvorki || 0}</p></div>
                      <Package className="w-8 h-8 text-cyan-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-pink-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-muted-foreground">Открытых проектов</p><p className="text-3xl font-bold mt-1">{stats?.openProjects || 0}</p></div>
                      <FolderOpen className="w-8 h-8 text-pink-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="access">
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Управление ролями пользователей. Вы можете назначать администраторов и передавать права владельца.</p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {allUsersData?.items.map(u => (
                <Card key={u.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.name || 'Без имени'}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · ID: {u.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'owner' ? 'destructive' : u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                      <Select value={u.role} onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as any })}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="owner">owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
