import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { Megaphone, Plus, Eye, MousePointer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { startLogin } from "@/const";

export default function AdsCabinet() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: myAds } = trpc.ads.my.useQuery(undefined, { enabled: isAuthenticated });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", placement: "homepage_top", pricePerDay: "", startDate: "", endDate: "" });

  const createAd = trpc.ads.create.useMutation({
    onSuccess: () => { toast.success("Рекламная кампания создана! Ожидает модерации."); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Megaphone className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Рекламный кабинет</h2>
          <p className="text-muted-foreground mb-6">Размещайте рекламу на платформе Komexpo Work</p>
          <Button onClick={() => startLogin()}>Войти для доступа</Button>
        </div>
      </Layout>
    );
  }

  const placementLabels: Record<string, string> = {
    homepage_top: "Главная — верх",
    homepage_side: "Главная — боковая",
    catalog_top: "Каталог — верх",
    catalog_side: "Каталог — боковая",
    project_page: "Страница проекта",
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Рекламный кабинет</h1>
            <p className="text-muted-foreground mt-1">Управление рекламными кампаниями на платформе</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="w-4 h-4" />Создать кампанию</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Новая рекламная кампания</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Название кампании" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
                <Input placeholder="URL изображения баннера" value={form.imageUrl} onChange={e => setForm(f => ({...f, imageUrl: e.target.value}))} />
                <Input placeholder="Ссылка при клике" value={form.linkUrl} onChange={e => setForm(f => ({...f, linkUrl: e.target.value}))} />
                <Select value={form.placement} onValueChange={v => setForm(f => ({...f, placement: v}))}>
                  <SelectTrigger><SelectValue placeholder="Размещение" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homepage_top">Главная — верх</SelectItem>
                    <SelectItem value="homepage_side">Главная — боковая</SelectItem>
                    <SelectItem value="catalog_top">Каталог — верх</SelectItem>
                    <SelectItem value="catalog_side">Каталог — боковая</SelectItem>
                    <SelectItem value="project_page">Страница проекта</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Цена за день (₽)" type="number" value={form.pricePerDay} onChange={e => setForm(f => ({...f, pricePerDay: e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
                </div>
                <Button className="w-full" onClick={() => createAd.mutate({
                  ...form, pricePerDay: Number(form.pricePerDay),
                  placement: form.placement as any,
                })} disabled={createAd.isPending}>Создать кампанию</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {myAds?.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>У вас пока нет рекламных кампаний</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAds?.map(ad => (
              <Card key={ad.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium">{ad.title}</h3>
                    <Badge variant={ad.status === 'active' ? 'default' : ad.status === 'pending' ? 'outline' : 'secondary'}>{ad.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{placementLabels[ad.placement] || ad.placement}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{ad.impressions}</span>
                    <span className="flex items-center gap-1"><MousePointer className="w-4 h-4" />{ad.clicks}</span>
                    <span className="text-muted-foreground">{Number(ad.pricePerDay).toLocaleString('ru-RU')} ₽/день</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
