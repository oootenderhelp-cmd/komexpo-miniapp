import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Globe, Award, MessageSquare, CheckCircle, TrendingUp, Clock, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  freelancer: "Фрилансер",
  agency: "Подрядчик/Агентство Komexpo",
  employee: "Сотрудник Komexpo",
};

const statusColors: Record<string, string> = {
  freelancer: "bg-blue-100 text-blue-800 border-blue-200",
  agency: "bg-purple-100 text-purple-800 border-purple-200",
  employee: "bg-green-100 text-green-800 border-green-200",
};

const statusBgGradient: Record<string, string> = {
  freelancer: "from-blue-50 to-blue-100/50",
  agency: "from-purple-50 to-purple-100/50",
  employee: "from-green-50 to-green-100/50",
};

export default function ContractorProfile() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const { data: profile, isLoading } = trpc.profile.get.useQuery({ userId: Number(id) });
  const { data: reviews } = trpc.reviews.forUser.useQuery({ userId: Number(id) });

  if (isLoading) return <Layout><div className="container py-16 text-center">Загрузка...</div></Layout>;
  if (!profile) return <Layout><div className="container py-16 text-center">Профиль не найден</div></Layout>;

  const handleMessage = () => {
    if (!isAuthenticated) {
      toast.error("Войдите в аккаунт для отправки сообщения");
      return;
    }
    toast.info("Функция чата будет доступна в ближайшее время");
  };

  const handleHire = () => {
    if (!isAuthenticated) {
      toast.error("Войдите в аккаунт");
      return;
    }
    toast.info("Функция найма будет доступна в ближайшее время");
  };

  const avgRating = reviews && reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <Layout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className={`bg-gradient-to-r ${statusBgGradient[profile.contractorStatus || 'freelancer']} rounded-lg p-8 mb-8 border`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Avatar */}
            <div className="md:col-span-1">
              <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center mx-auto">
                <span className="text-5xl font-bold text-primary">{(profile.displayName || 'U')[0]}</span>
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-3">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.displayName || 'Пользователь'}</h1>
                  {profile.contractorStatus && (
                    <Badge className={`${statusColors[profile.contractorStatus] || ''} border`}>
                      {statusLabels[profile.contractorStatus] || profile.contractorStatus}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleMessage} variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Написать
                  </Button>
                  <Button onClick={handleHire} size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Нанять
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-lg">{avgRating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reviews?.length || 0} отзывов</p>
                </div>
                <div>
                  <div className="font-bold text-lg">{profile.completedOrders || 0}</div>
                  <p className="text-sm text-muted-foreground">Завершено заказов</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-bold text-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    100%
                  </div>
                  <p className="text-sm text-muted-foreground">Ответственность</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-bold text-lg">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    {profile.rating}
                  </div>
                  <p className="text-sm text-muted-foreground">Рейтинг</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Контактная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.city && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{profile.city}</p>
                      <p className="text-xs text-muted-foreground">{profile.country}</p>
                    </div>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <a href={profile.website} className="text-sm text-primary hover:underline break-all" target="_blank" rel="noopener">
                      {profile.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Время ответа</span>
                  <Badge variant="outline">~1 час</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">На платформе</span>
                  <span className="text-sm font-medium">с 2024</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Язык</span>
                  <span className="text-sm font-medium">Русский</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">О себе</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {profile.bio || 'Информация не указана'}
                </p>
              </CardContent>
            </Card>

            {/* Skills */}
            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Навыки и специализация
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(profile.skills as unknown as string[]).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {`${skill}`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Отзывы ({reviews?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Отзывов пока нет</p>
                ) : (
                  <div className="space-y-4">
                    {reviews?.map(review => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex gap-1">
                            {Array.from({length: 5}).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.comment || 'Без комментария'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
