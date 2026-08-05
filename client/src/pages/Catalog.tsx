import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Search, Star, Clock, Eye, Heart, CheckCircle, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import KvorkaCard from "@/components/KvorkaCard";

export default function Catalog() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("new");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const { data: categories } = trpc.categories.list.useQuery();
  const addFavorite = trpc.favorites.toggle.useMutation({
    onSuccess: () => toast.success("Добавлено в избранное"),
    onError: (e: any) => toast.error(e.message),
  });

  const filters = useMemo(() => ({
    search: search || undefined,
    categoryId: categoryId === "all" ? undefined : Number(categoryId),
    minPrice: priceRange === "low" ? undefined : priceRange === "mid" ? 1000 : priceRange === "high" ? 5000 : undefined,
    maxPrice: priceRange === "low" ? 1000 : priceRange === "mid" ? 5000 : undefined,
  }), [search, categoryId, priceRange]);

  const { data, isLoading } = trpc.kvorki.list.useQuery(filters);

  const sortedKvorki = useMemo(() => {
    if (!data?.items) return [];
    const sorted = [...data.items];
    
    if (sortBy === "popular") {
      sorted.sort((a, b) => (Number(b.orderCount) || 0) - (Number(a.orderCount) || 0));
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "price-low") {
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-high") {
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
    }
    // "new" is default (no sort needed)
    
    return sorted;
  }, [data?.items, sortBy]);

  const handleFavorite = (kvorkiId: number) => {
    if (!isAuthenticated) {
      toast.error("Войдите в аккаунт");
      return;
    }
    setFavorites(prev => new Set(prev).add(kvorkiId));
        addFavorite.mutate({ kvorkiId, contractorId: undefined });
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Каталог услуг (Кворки)</h1>
          <p className="text-muted-foreground">Найдите нужную услугу среди тысяч предложений от проверенных исполнителей</p>
        </div>

        {/* Filters Section */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="text-sm font-medium block mb-2">Поиск услуг</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Введите название услуги..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium block mb-2">Категория</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div>
              <label className="text-sm font-medium block mb-2">Цена</label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger><SelectValue placeholder="Выберите диапазон" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любая цена</SelectItem>
                  <SelectItem value="low">До 1 000 ₽</SelectItem>
                  <SelectItem value="mid">1 000 - 5 000 ₽</SelectItem>
                  <SelectItem value="high">От 5 000 ₽</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Найдено: {data?.total || 0} услуг</p>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Сортировка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="popular">Популярные</SelectItem>
                <SelectItem value="rating">По рейтингу</SelectItem>
                <SelectItem value="price-low">Цена: возрастание</SelectItem>
                <SelectItem value="price-high">Цена: убывание</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-48 bg-muted rounded-lg" /></CardContent></Card>
            ))}
          </div>
        ) : sortedKvorki.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground text-lg">Услуги не найдены</p>
            <p className="text-sm text-muted-foreground mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedKvorki.map(kvorka => (
              <div key={kvorka.id} className="group">
                <Link href={`/kvorka/${kvorka.id}`}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer overflow-hidden h-full flex flex-col">
                    {/* Image/Preview */}
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                      <span className="text-5xl opacity-20">🎨</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFavorite(kvorka.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all"
                      >
                        <Heart className={`w-5 h-5 ${favorites.has(kvorka.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                      </button>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4 flex-1 flex flex-col">
                      {/* Title */}
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2">
                        {kvorka.title}
                      </h3>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {kvorka.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {kvorka.orderCount} заказов
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {kvorka.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {kvorka.deliveryDays} дн.
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-auto pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            {Number(kvorka.price).toLocaleString('ru-RU')} ₽
                          </span>
                          {kvorka.status === 'active' && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
