import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { ShoppingCart, FolderOpen, Wallet, Heart, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ReviewForm from "@/components/ReviewForm";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ожидает", variant: "outline" },
  in_progress: { label: "В работе", variant: "default" },
  delivered: { label: "Доставлен", variant: "secondary" },
  revision: { label: "На доработке", variant: "outline" },
  completed: { label: "Завершён", variant: "secondary" },
  cancelled: { label: "Отменён", variant: "destructive" },
  dispute: { label: "Спор", variant: "destructive" },
};

export default function CustomerDashboard() {
  const { isAuthenticated, user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: orders } = trpc.orders.myAsCustomer.useQuery(undefined, { enabled: isAuthenticated });
  const { data: profile } = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: transactions } = trpc.transactions.my.useQuery(undefined, { enabled: isAuthenticated });
  const { data: favorites } = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated });
  const [depositAmount, setDepositAmount] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);

  const deposit = trpc.transactions.deposit.useMutation({
    onSuccess: () => { toast.success("Баланс пополнен!"); setDepositOpen(false); setDepositAmount(""); },
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
          <h1 className="text-2xl font-bold">Кабинет заказчика</h1>
          <div className="flex items-center gap-3">
            <Card className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Баланс: </span>
              <span className="font-bold text-primary">{Number(profile?.balance || 0).toLocaleString('ru-RU')} ₽</span>
            </Card>
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" />Пополнить</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Пополнение баланса</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Сумма (₽)" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Средства будут зачислены на ваш баланс для оплаты заказов через безопасную сделку.</p>
                  <Button className="w-full" onClick={() => deposit.mutate({ amount: Number(depositAmount) })} disabled={deposit.isPending}>Пополнить</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="w-4 h-4" />Заказы</TabsTrigger>
            <TabsTrigger value="projects" className="gap-1"><FolderOpen className="w-4 h-4" />Проекты</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><Wallet className="w-4 h-4" />Транзакции</TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1"><Heart className="w-4 h-4" />Избранное</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">У вас пока нет заказов. <Link href="/catalog" className="text-primary hover:underline">Перейти в каталог</Link></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {orders?.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.title}</p>
                        <p className="text-sm text-muted-foreground">#{order.orderNumber} &middot; {Number(order.amount).toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusMap[order.status]?.variant || "outline"}>{statusMap[order.status]?.label || order.status}</Badge>
                        {order.status === 'delivered' && (
                          <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: order.id, status: 'completed' })}>Принять</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects">
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Ваши проекты отображаются на <Link href="/projects" className="text-primary hover:underline">бирже проектов</Link>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="transactions">
            {transactions?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Нет транзакций</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {transactions?.map(tx => (
                  <Card key={tx.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <span className={`font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{Number(tx.amount).toLocaleString('ru-RU')} ₽
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favorites?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Нет избранных услуг</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {favorites?.map(fav => (
                  <Card key={fav.id}><CardContent className="p-3">
                    {fav.kvorkiId && <Link href={`/kvorka/${fav.kvorkiId}`} className="text-primary hover:underline text-sm">Кворка #{fav.kvorkiId}</Link>}
                    {fav.contractorId && <Link href={`/contractor/${fav.contractorId}`} className="text-primary hover:underline text-sm">Подрядчик #{fav.contractorId}</Link>}
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
