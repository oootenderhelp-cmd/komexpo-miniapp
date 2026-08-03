import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import FileUpload from "@/components/FileUpload";

export default function ProfileSetup() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => toast.success("Профиль обновлён!"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    isCustomer: true,
    isContractor: false,
    contractorStatus: "freelancer" as "freelancer" | "agency" | "employee",
    phone: "",
    city: "",
    country: "Россия",
    website: "",
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        isCustomer: profile.isCustomer,
        isContractor: profile.isContractor,
        contractorStatus: profile.contractorStatus || "freelancer",
        phone: profile.phone || "",
        city: profile.city || "",
        country: profile.country || "Россия",
        website: profile.website || "",
        skills: (profile.skills as string[]) || [],
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) return <Layout><div className="container py-16 text-center text-muted-foreground">Загрузка...</div></Layout>;

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm(f => ({ ...f, skills: [...f.skills, skillInput.trim()] }));
      setSkillInput("");
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Настройки профиля</h1>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Аватар профиля</Label>
              <FileUpload 
                onUpload={(file) => {
                  setAvatarFile(file);
                  toast.success("Аватар выбран");
                }}
                accept="image/*"
                maxSize={2 * 1024 * 1024}
                label="Выбрать аватар"
                preview
              />
            </div>

            <div className="space-y-2">
              <Label>Отображаемое имя</Label>
              <Input value={form.displayName} onChange={e => setForm(f => ({...f, displayName: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>О себе</Label>
              <Textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={form.isCustomer} onCheckedChange={v => setForm(f => ({...f, isCustomer: v}))} />
                <Label>Я заказчик</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isContractor} onCheckedChange={v => setForm(f => ({...f, isContractor: v}))} />
                <Label>Я подрядчик</Label>
              </div>
            </div>

            {form.isContractor && (
              <div className="space-y-2">
                <Label>Статус подрядчика</Label>
                <Select value={form.contractorStatus} onValueChange={v => setForm(f => ({...f, contractorStatus: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freelancer">Фрилансер</SelectItem>
                    <SelectItem value="agency">Подрядчик/Агентство Komexpo</SelectItem>
                    <SelectItem value="employee">Сотрудник Komexpo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Телефон</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
              <div className="space-y-2"><Label>Город</Label><Input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
            </div>

            <div className="space-y-2">
              <Label>Навыки</Label>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Добавить навык" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                <Button type="button" variant="secondary" onClick={addSkill}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.skills.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs flex items-center gap-1">
                    {s} <button onClick={() => setForm(f => ({...f, skills: f.skills.filter((_, idx) => idx !== i)}))} className="text-muted-foreground hover:text-foreground">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Сохранение..." : "Сохранить профиль"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
