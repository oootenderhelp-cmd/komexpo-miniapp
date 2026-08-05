import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { CreditCard, Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function PaymentPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: transactions } = trpc.transactions.my.useQuery(undefined, { enabled: isAuthenticated });

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({ number: "", holder: "", expiry: "" });
  const [bankDetails, setBankDetails] = useState({ account: "", bank: "", bik: "" });

  const deposit = trpc.transactions.deposit.useMutation({
    onSuccess: () => {
      toast.success("Платёж инициирован. Перенаправляем на ЮKassa...");
      setDepositAmount("");
      // Simulate redirect to payment gateway
      setTimeout(() => {
        toast.success("Платёж успешно обработан (демо)");
      }, 2000);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const withdraw = trpc.transactions.withdraw.useMutation({
    onSuccess: () => {
      toast.success("Запрос на вывод создан. Средства будут переведены в течение 1-3 дней.");
      setWithdrawAmount("");
      setCardDetails({ number: "", holder: "", expiry: "" });
      setBankDetails({ account: "", bank: "", bik: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) return <Layout><div className="container py-16 text-center text-muted-foreground">Загрузка...</div></Layout>;

  const handleDeposit = () => {
    if (!depositAmount || Number(depositAmount) < 100) {
      toast.error("Минимальная сумма пополнения: 100 ₽");
      return;
    }
    deposit.mutate({ amount: Number(depositAmount) });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || Number(withdrawAmount) < 500) {
      toast.error("Минимальная сумма вывода: 500 ₽");
      return;
    }
    if (Number(withdrawAmount) > Number(profile?.balance || 0)) {
      toast.error("Недостаточно средств");
      return;
    }
    withdraw.mutate({ 
      amount: Number(withdrawAmount),
      method: withdrawMethod,
      details: withdrawMethod === "card" ? cardDetails : bankDetails,
    } as any);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Платежи и финансы</h1>
          <p className="text-muted-foreground">Управляйте своим балансом и платежами</p>
        </div>

        {/* Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Текущий баланс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {Number(profile?.balance || 0).toLocaleString('ru-RU')} ₽
              </div>
              <p className="text-xs text-muted-foreground mt-2">Доступно для вывода</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Пополнено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {transactions?.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString('ru-RU')} ₽
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" /> Выведено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {transactions?.filter(t => t.type === 'withdrawal' || t.type === 'payout').reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString('ru-RU')} ₽
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deposit" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="deposit" className="gap-1"><CreditCard className="w-4 h-4" />Пополнить баланс</TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-1"><Wallet className="w-4 h-4" />Вывести средства</TabsTrigger>
            <TabsTrigger value="history" className="gap-1"><Clock className="w-4 h-4" />История</TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card>
              <CardHeader>
                <CardTitle>Пополнение баланса через ЮKassa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💳 Безопасное пополнение через платежную систему ЮKassa. Поддерживаются карты Visa, Mastercard, Яндекс.Касса и другие способы оплаты.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Сумма пополнения (₽)</Label>
                  <Input 
                    type="number" 
                    placeholder="Минимум 100 ₽" 
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    min="100"
                  />
                  <p className="text-xs text-muted-foreground">Комиссия: 0% (платформа берёт на себя)</p>
                </div>

                <div className="space-y-2">
                  <Label>Доступные способы оплаты</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Карта", "Яндекс.Касса", "Сбербанк", "Альфа-Банк"].map(method => (
                      <button key={method} className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-sm">
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleDeposit}
                  disabled={deposit.isPending || !depositAmount}
                >
                  {deposit.isPending ? "Обработка..." : "Перейти к оплате"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <Card>
              <CardHeader>
                <CardTitle>Вывод средств</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    ⏱️ Вывод средств обрабатывается в течение 1-3 рабочих дней. Минимальная сумма: 500 ₽.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Сумма вывода (₽)</Label>
                  <Input 
                    type="number" 
                    placeholder="Минимум 500 ₽" 
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    min="500"
                  />
                  <p className="text-xs text-muted-foreground">Доступно: {Number(profile?.balance || 0).toLocaleString('ru-RU')} ₽</p>
                </div>

                <div className="space-y-2">
                  <Label>Способ вывода</Label>
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Банковская карта</SelectItem>
                      <SelectItem value="bank">Банковский счёт</SelectItem>
                      <SelectItem value="wallet">Электронный кошелёк</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Details */}
                {withdrawMethod === "card" && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <Input 
                      placeholder="Номер карты (16 цифр)" 
                      value={cardDetails.number}
                      onChange={e => setCardDetails({...cardDetails, number: e.target.value})}
                      maxLength={16}
                    />
                    <Input 
                      placeholder="Имя владельца" 
                      value={cardDetails.holder}
                      onChange={e => setCardDetails({...cardDetails, holder: e.target.value})}
                    />
                    <Input 
                      placeholder="Срок действия (MM/YY)" 
                      value={cardDetails.expiry}
                      onChange={e => setCardDetails({...cardDetails, expiry: e.target.value})}
                      maxLength={5}
                    />
                  </div>
                )}

                {/* Bank Details */}
                {withdrawMethod === "bank" && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <Input 
                      placeholder="Номер счёта" 
                      value={bankDetails.account}
                      onChange={e => setBankDetails({...bankDetails, account: e.target.value})}
                    />
                    <Input 
                      placeholder="Название банка" 
                      value={bankDetails.bank}
                      onChange={e => setBankDetails({...bankDetails, bank: e.target.value})}
                    />
                    <Input 
                      placeholder="БИК банка" 
                      value={bankDetails.bik}
                      onChange={e => setBankDetails({...bankDetails, bik: e.target.value})}
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleWithdraw}
                  disabled={withdraw.isPending || !withdrawAmount}
                >
                  {withdraw.isPending ? "Обработка..." : "Создать запрос на вывод"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>История транзакций</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет транзакций</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions?.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'escrow_release' ? (
                              <ArrowUpCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.type === 'deposit' || tx.type === 'escrow_release' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'deposit' || tx.type === 'escrow_release' ? '+' : '-'}{Number(tx.amount).toLocaleString('ru-RU')} ₽
                          </p>
                          <p className="text-xs text-muted-foreground">Статус: Завершено</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
