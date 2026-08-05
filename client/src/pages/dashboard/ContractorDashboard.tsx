import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { Package, ShoppingCart, Wallet, Plus, ArrowDownToLine } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ожидает", variant: "outline" },
  in_progress: { label: "В работе", variant: "default" },
  delivered: { label: "Доставлен", variant: "secondary" },
  completed: { label: "Завершён", variant: "secondary" },
  cancelled: { label: "Отменён", variant: "destructive" },
  dispute: { label: "Спор", variant: "destructive" },
};

export default function ContractorDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: myKvorki } = trpc.kvorki.my.useQuery(undefined, { enabled: isAuthenticated });
  const { data: orders } = trpc.orders.myAsContractor.useQuery(undefined, { enabled: isAuthenticated });
  const { data: profile } = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: categories } = trpc.categories.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [newKvorka, setNewKvorka] = useState({ title: "", description: "", price: "", deliveryDays: "", categoryId: "" });

  const createKvorka = trpc.kvorki.create.useMutation({
    onSuccess: () => { toast.success("Кворка создана!"); setCreateOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const withdraw = trpc.transactions.withdraw.useMutation({
    onSuccess: () => { toast.success("Заявка на вывод создана!"); setWithdrawOpen(false); setWithdrawAmount(""); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => toast.success("Статус обновлён"),
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) return <Layout><div className="container py-16 text-center text-muted-foreground">Загрузка...</div></Layout>;

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Кабинет подрядчика</h1>
          <div className="flex items-center gap-3">
            <Card className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Баланс: </span>
              <span className="font-bold text-green-600">{Number(profile?.balance || 0).toLocaleString('ru-RU')} ₽</span>
            </Card>
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><ArrowDownToLine className="w-4 h-4" />Вывести</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Вывод средств</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Сумма (₽)" type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Средства будут выведены на ваши реквизиты в течение 1-3 рабочих дней.</p>
                  <Button className="w-full" onClick={() => withdraw.mutate({ amount: Number(withdrawAmount) })} disabled={withdraw.isPending}>Вывести</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="kvorki">
          <TabsList className="mb-6">
            <TabsTrigger value="kvorki" className="gap-1"><Package className="w-4 h-4" />Мои кворки</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="w-4 h-4" />Заказы</TabsTrigger>
            <TabsTrigger value="balance" className="gap-1"><Wallet className="w-4 h-4" />Финансы</TabsTrigger>
          </TabsList>

          <TabsContent value="kvorki">
            <div className="flex justify-end mb-4">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild><Button className="gap-1"><Plus className="w-4 h-4" />Создать кворку</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Новая кворка</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Название услуги" value={newKvorka.title} onChange={e => setNewKvorka(f => ({...f, title: e.target.value}))} />
                    <Textarea placeholder="Описание (мин. 20 символов)" value={newKvorka.description} onChange={e => setNewKvorka(f => ({...f, description: e.target.value}))} rows={4} />
                    <Select value={newKvorka.categoryId} onValueChange={v => setNewKvorka(f => ({...f, categoryId: v}))}>
                      <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Цена (₽)" type="number" value={newKvorka.price} onChange={e => setNewKvorka(f => ({...f, price: e.target.value}))} />
                      <Input placeholder="Срок (дней)" type="number" value={newKvorka.deliveryDays} onChange={e => setNewKvorka(f => ({...f, deliveryDays: e.target.value}))} />
                    </div>
                    <Button className="w-full" onClick={() => createKvorka.mutate({
                      title: newKvorka.title, description: newKvorka.description,
                      price: Number(newKvorka.price), deliveryDays: Number(newKvorka.deliveryDays),
                      categoryId: Number(newKvorka.categoryId),
                    })} disabled={createKvorka.isPending}>Создать</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {myKvorki?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">У вас пока нет кворок. Создайте первую!</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myKvorki?.map(k => (
                  <Card key={k.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{k.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{Number(k.price).toLocaleString('ru-RU')} ₽ &middot; {k.deliveryDays} дн.</p>
                        </div>
                        <Badge variant={k.status === 'active' ? 'default' : 'secondary'}>{k.status === 'active' ? 'Активна' : k.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Нет входящих заказов</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {orders?.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.title}</p>
                        <p className="text-sm text-muted-foreground">#{order.orderNumber} &middot; Вы получите: {Number(order.contractorPayout).toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusMap[order.status]?.variant || "outline"}>{statusMap[order.status]?.label || order.status}</Badge>
                        {order.status === 'in_progress' && (
                          <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}>Сдать работу</Button>
                        )}
                        {order.status === 'pending' && (
                          <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: 'in_progress' })}>Начать</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="balance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Доступно</p><p className="text-2xl font-bold text-green-600">{Number(profile?.balance || 0).toLocaleString('ru-RU')} ₽</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Заморожено</p><p className="text-2xl font-bold text-yellow-600">{Number(profile?.frozenBalance || 0).toLocaleString('ru-RU')} ₽</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Выполнено заказов</p><p className="text-2xl font-bold">{profile?.completedOrders || 0}</p></CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
