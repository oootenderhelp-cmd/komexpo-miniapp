import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startLogin } from "@/const";
import Layout from "@/components/Layout";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Shield, Zap, Users, Star, Palette, Code, TrendingUp, FileText, Video, Briefcase, GraduationCap, Settings } from "lucide-react";

const iconMap: Record<string, any> = { Palette, Code, TrendingUp, FileText, Video, Briefcase, GraduationCap, Settings };

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: categories } = trpc.categories.list.useQuery();

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 lg:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">Безопасная сделка с гарантией</Badge>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Найдите идеального <span className="text-primary">исполнителя</span> или <span className="text-primary">заказчика</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Komexpo Work — фриланс-платформа с безопасными сделками, каталогом услуг и биржей проектов. Для заказчиков и исполнителей с личными кабинетами.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/catalog">
                <Button size="lg" className="gap-2">
                  Найти исполнителя <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline">Найти заказ</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Почему выбирают Komexpo Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Безопасная сделка</h3>
                <p className="text-sm text-muted-foreground">Деньги замораживаются до выполнения заказа. Арбитраж споров.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Быстрый старт</h3>
                <p className="text-sm text-muted-foreground">Тысячи готовых услуг от проверенных исполнителей с фиксированной ценой.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Проверенные специалисты</h3>
                <p className="text-sm text-muted-foreground">Фрилансеры, агентства и сотрудники Komexpo с рейтингом и отзывами.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Категории услуг</h2>
            <Link href="/catalog">
              <Button variant="ghost" className="gap-1">Все категории <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories?.map(cat => {
              const Icon = iconMap[cat.icon || ''] || Briefcase;
              return (
                <Link key={cat.id} href={`/catalog/${cat.slug}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cat.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Готовы начать?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Зарегистрируйтесь как заказчик или подрядчик и начните работу уже сегодня.
          </p>
          {!isAuthenticated && (
            <Button size="lg" variant="secondary" onClick={() => startLogin()} className="gap-2">
              Создать аккаунт <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </section>
    </Layout>
  );
}
