import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, RefreshCw, Shield, Heart, Share2, CheckCircle, TrendingUp, Eye, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import Layout from "@/components/Layout";
import { useState } from "react";
import { Link } from "wouter";

export default function KvorkaDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { data: kvorka, isLoading } = trpc.kvorki.getById.useQuery({ id: Number(id) });
  const { data: contractor } = trpc.profile.get.useQuery({ userId: kvorka?.userId || 0 }, { enabled: !!kvorka?.userId });
  
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Заказ создан! Перейдите в кабинет заказчика.");
      navigate("/dashboard/customer");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFavorite = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "Удалено из избранного" : "Добавлено в избранное");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Layout><div className="container py-16 text-center">Загрузка...</div></Layout>;
  if (!kvorka) return <Layout><div className="container py-16 text-center">Услуга не найдена</div></Layout>;

  const handleOrder = () => {
    if (!isAuthenticated) { startLogin(); return; }
    createOrder.mutate({
      contractorId: kvorka.userId,
      kvorkiId: kvorka.id,
      title: kvorka.title,
      amount: Number(kvorka.price),
      deliveryDays: kvorka.deliveryDays,
    });
  };

  const handleFavorite = () => {
    if (!isAuthenticated) { startLogin(); return; }
    toggleFavorite.mutate({ kvorkiId: kvorka.id, contractorId: undefined });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: kvorka.title,
        text: kvorka.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована");
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-3">{kvorka.title}</h1>
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{kvorka.rating}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      {kvorka.orderCount} заказов
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      {kvorka.viewCount} просмотров
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {kvorka.status === 'active' ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Image */}
            <div className="h-80 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-xl flex items-center justify-center border overflow-hidden">
              <span className="text-8xl opacity-20">🎨</span>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Описание услуги</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {kvorka.description}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Что входит в услугу</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Срок</p>
                      <p className="text-xs text-muted-foreground">{kvorka.deliveryDays} дней</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Правки</p>
                      <p className="text-xs text-muted-foreground">{kvorka.revisions} шт</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Безопасность</p>
                      <p className="text-xs text-muted-foreground">100% гарантия</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {Array.isArray(kvorka.tags) && kvorka.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Теги</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(kvorka.tags as unknown as string[]).map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <Card className="sticky top-20 border-2 border-primary">
              <CardHeader className="bg-primary/5">
                <div className="text-3xl font-bold text-primary mb-2">
                  {Number(kvorka.price).toLocaleString('ru-RU')} ₽
                </div>
                <p className="text-xs text-muted-foreground">Стоимость услуги</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">Срок выполнения</p>
                      <p className="text-xs text-muted-foreground">{kvorka.deliveryDays} дней</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <RefreshCw className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">Количество правок</p>
                      <p className="text-xs text-muted-foreground">{kvorka.revisions} неограниченные</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Безопасная сделка</p>
                      <p className="text-xs text-muted-foreground">Гарантирована</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleOrder} 
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "Создание заказа..." : "Заказать услугу"}
                </Button>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleFavorite}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    Избранное
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Средства будут заморожены до завершения работы
                </p>
              </CardContent>
            </Card>

            {/* Contractor Card */}
            {contractor && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Исполнитель</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href={`/contractor/${contractor.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">{(contractor.displayName || 'U')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contractor.displayName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {contractor.rating}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <Separator />
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Заказов выполнено</span>
                      <span className="font-medium">{contractor.completedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ответственность</span>
                      <span className="font-medium text-green-600">100%</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    Написать исполнителю
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
