import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, DollarSign, MessageSquare, Plus, Search, Filter, TrendingUp } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";

export default function ProjectBoard() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.projects.list.useQuery({});
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"new" | "popular" | "budget">("new");
  const [budgetFilter, setBudgetFilter] = useState<string>("");

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => { toast.success("Проект опубликован!"); setOpen(false); setTitle(""); setDescription(""); setBudget(""); },
    onError: (e) => toast.error(e.message),
  });

  const filteredProjects = useMemo(() => {
    let filtered = data?.items || [];
    
    // Фильтр по поиску
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Фильтр по бюджету
    if (budgetFilter && budgetFilter !== 'all') {
      const [min, max] = budgetFilter.split('-').map(Number);
      filtered = filtered.filter(p => {
        const projectBudget = Number(p.budget) || 0;
        if (max === 999999) return projectBudget >= min;
        return projectBudget >= min && projectBudget <= max;
      });
    }
    
    // Сортировка
    const sorted = [...filtered];
    if (sortBy === "new") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "popular") {
      sorted.sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0));
    } else if (sortBy === "budget") {
      sorted.sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0));
    }
    
    return sorted;
  }, [data?.items, searchTerm, budgetFilter, sortBy]);

  return (
    <Layout>
      <div className="container py-8">
        {/* Заголовок и кнопка создания */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Биржа проектов</h1>
            <p className="text-muted-foreground mt-1">Найдите проект или разместите свой</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { if (!isAuthenticated) { startLogin(); return; } setOpen(true); }}>
                <Plus className="w-4 h-4" /> Разместить проект
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый проект</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Название проекта" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Описание задачи (минимум 20 символов)" value={description} onChange={e => setDescription(e.target.value)} rows={5} />
                <Input placeholder="Бюджет (₽)" type="number" value={budget} onChange={e => setBudget(e.target.value)} />
                <Button className="w-full" onClick={() => createProject.mutate({ title, description, budget: budget ? Number(budget) : undefined })} disabled={createProject.isPending}>
                  Опубликовать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Статистика биржи */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Проектов на бирже</p>
              <p className="text-2xl font-bold mt-1">{data?.items.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Общая сумма</p>
              <p className="text-2xl font-bold mt-1">{(data?.items.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0).toLocaleString('ru-RU')} ₽</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Откликов получено</p>
              <p className="text-2xl font-bold mt-1">{data?.items.reduce((sum, p) => sum + (p.responseCount || 0), 0) || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Поиск и фильтры */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Поиск проектов..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={budgetFilter} onValueChange={setBudgetFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Бюджет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все бюджеты</SelectItem>
              <SelectItem value="0-1000">До 1 000 ₽</SelectItem>
              <SelectItem value="1000-5000">1 000 - 5 000 ₽</SelectItem>
              <SelectItem value="5000-10000">5 000 - 10 000 ₽</SelectItem>
              <SelectItem value="10000-50000">10 000 - 50 000 ₽</SelectItem>
              <SelectItem value="50000-999999">50 000+ ₽</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Новые</SelectItem>
              <SelectItem value="popular">Популярные</SelectItem>
              <SelectItem value="budget">По бюджету</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground text-lg">Проектов не найдено</p>
            <p className="text-sm text-muted-foreground mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors">{project.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {project.budget && (
                            <span className="flex items-center gap-1 font-medium text-foreground"><DollarSign className="w-4 h-4" />{Number(project.budget).toLocaleString('ru-RU')} ₽</span>
                          )}
                          <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{project.responseCount} откликов</span>
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                      <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                        {project.status === 'open' ? 'Открыт' : project.status === 'in_progress' ? 'В работе' : 'Завершён'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
