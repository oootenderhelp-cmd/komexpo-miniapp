/**
 * Публичная страница записи к стоматологу.
 *
 * Заявку заполняет сам пациент. Метки кампании подхватываются из адреса
 * страницы — так видно, из какой рекламы пришёл человек, при этом никаких
 * данных о нём со стороны не собирается.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import DentalAnalytics, {
  trackLeadSubmitted,
} from "@/components/dental/DentalAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  MESSENGER_LABELS,
  symptomLabel,
  type MessengerType,
  type ReadinessWindow,
  type Symptom,
  type UrgencyTier,
} from "@shared/dental";

const SYMPTOMS: Symptom[] = [
  "acute_pain",
  "swelling",
  "bleeding",
  "trauma",
  "lost_filling",
  "aesthetic",
  "none",
];

const READINESS: { value: ReadinessWindow; label: string }[] = [
  { value: "today", label: "Готов приехать сегодня" },
  { value: "this_week", label: "На этой неделе" },
  { value: "this_month", label: "В течение месяца" },
  { value: "researching", label: "Пока выбираю клинику" },
];

const MESSENGERS: MessengerType[] = [
  "telegram",
  "max",
  "vk",
  "whatsapp",
  "none",
];

type Submitted = {
  publicId: string;
  tier: UrgencyTier;
  slaMinutes: number;
  leadMagnet: string;
  clinic: { name: string; city: string } | null;
};

export default function DentalBooking() {
  const search = useSearch();
  const { data: services } = trpc.dental.services.useQuery();
  const { data: cities } = trpc.dental.cities.useQuery();

  const [serviceSlug, setServiceSlug] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [messengerType, setMessengerType] = useState<MessengerType>("none");
  const [messengerHandle, setMessengerHandle] = useState("");
  const [painLevel, setPainLevel] = useState(0);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [readiness, setReadiness] = useState<ReadinessWindow>("this_week");
  const [comment, setComment] = useState("");
  const [consentPd, setConsentPd] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  // Метки кампании: «где поймали» заявку — это про объявление, а не про человека.
  const utm = useMemo(() => {
    const params = new URLSearchParams(search);
    const pick = (key: string) => params.get(key) ?? undefined;
    return {
      sourceChannel: pick("channel") ?? pick("utm_source"),
      utmSource: pick("utm_source"),
      utmMedium: pick("utm_medium"),
      utmCampaign: pick("utm_campaign"),
      utmContent: pick("utm_content"),
      utmTerm: pick("utm_term"),
      landingPath:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    };
  }, [search]);

  // Ссылка из объявления может сразу вести на нужное направление и город.
  useEffect(() => {
    const params = new URLSearchParams(search);
    const preselected = params.get("service");
    if (preselected) setServiceSlug(preselected);
    const linkCity = params.get("city");
    if (linkCity) setCity(linkCity);
  }, [search]);

  // Если партнёр в стране пока один, выбирать город человеку незачем.
  useEffect(() => {
    if (!city && cities && cities.length === 1) setCity(cities[0].city);
  }, [cities, city]);

  const submit = trpc.dental.submitLead.useMutation({
    onSuccess: result => {
      trackLeadSubmitted(serviceSlug);
      setSubmitted({
        publicId: result.publicId,
        tier: result.urgency.tier,
        slaMinutes: result.slaMinutes,
        leadMagnet: result.leadMagnet,
        clinic: result.clinic,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSymptom = (symptom: Symptom) => {
    setSymptoms(prev => {
      // «Жалоб нет» несовместимо с остальными пунктами.
      if (symptom === "none") return prev.includes("none") ? [] : ["none"];
      const without = prev.filter(s => s !== "none");
      return without.includes(symptom)
        ? without.filter(s => s !== symptom)
        : [...without, symptom];
    });
  };

  const selectedService = services?.find(s => s.slug === serviceSlug);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceSlug) return toast.error("Выберите направление");
    if (!city.trim()) return toast.error("Укажите город");
    if (!consentPd)
      return toast.error("Нужно согласие на обработку персональных данных");
    if (
      consentMarketing &&
      messengerType !== "none" &&
      !messengerHandle.trim()
    ) {
      return toast.error(
        "Укажите ник в мессенджере или выберите «Только звонок»"
      );
    }
    submit.mutate({
      name,
      phone,
      email: email || undefined,
      messengerType,
      messengerHandle: messengerHandle || undefined,
      city: city.trim(),
      serviceSlug,
      comment: comment || undefined,
      painLevel,
      symptoms,
      readiness,
      consentPd: true,
      consentMarketing,
      ...utm,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-16">
        <DentalAnalytics />
        <Card className="mx-auto max-w-xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <CardTitle className="mt-4 text-2xl">Заявка принята</CardTitle>
            <CardDescription>
              Номер заявки: {submitted.publicId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" />
              <span>
                Администратор свяжется в течение{" "}
                {submitted.slaMinutes < 60
                  ? `${submitted.slaMinutes} минут`
                  : `${Math.round(submitted.slaMinutes / 60)} ч`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-sky-600" />
              <span>По заявке действует: {submitted.leadMagnet}</span>
            </div>
            {submitted.clinic && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>
                  Клиника: {submitted.clinic.name}, {submitted.clinic.city}
                </span>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-4 text-slate-600">
              Если передумаете — откройте{" "}
              <a
                className="font-medium text-sky-700 underline"
                href={`/dental/opt-out?id=${submitted.publicId}`}
              >
                страницу отзыва согласия
              </a>{" "}
              и укажите номер заявки {submitted.publicId}. Мы снимем её с работы
              и больше не будем писать.
            </div>
            <Button className="w-full" onClick={() => setSubmitted(null)}>
              Оставить ещё одну заявку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <DentalAnalytics />
      <header className="mx-auto max-w-5xl px-4 pt-14 pb-8 text-center">
        <Badge className="mb-4 bg-sky-100 text-sky-800 hover:bg-sky-100">
          <MapPin className="mr-1 h-3 w-3" />
          {cities && cities.length > 0
            ? `Клиники-партнёры: ${cities.length} ${cities.length === 1 ? "город" : "городов"}`
            : "Подбор стоматологической клиники"}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Запись к стоматологу
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Опишите, что беспокоит, — администратор подберёт врача и время. При
          острой боли принимаем в день обращения.
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Что беспокоит</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Направление</Label>
                <Select value={serviceSlug} onValueChange={setServiceSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите направление" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map(service => (
                      <SelectItem key={service.slug} value={service.slug}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedService && (
                  <p className="text-sm text-slate-500">
                    {selectedService.short}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-600" />
                  Насколько сильно болит: {painLevel} из 10
                </Label>
                <Slider
                  value={[painLevel]}
                  onValueChange={([v]) => setPainLevel(v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <Label>Что беспокоит дополнительно</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SYMPTOMS.map(symptom => (
                    <label
                      key={symptom}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={symptoms.includes(symptom)}
                        onCheckedChange={() => toggleSymptom(symptom)}
                      />
                      {symptomLabel(symptom)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-sky-600" />
                  Когда удобно прийти
                </Label>
                <RadioGroup
                  value={readiness}
                  onValueChange={v => setReadiness(v as ReadinessWindow)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {READINESS.map(option => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-slate-50"
                    >
                      <RadioGroupItem value={option.value} />
                      {option.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Комментарий</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Например: откололся зуб, нужна консультация по имплантации"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Как с вами связаться</CardTitle>
              <CardDescription>
                Мы пишем и звоним только по заявке — и только по тем контактам,
                которые вы указали.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                {cities && cities.length > 0 ? (
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => (
                        <SelectItem key={c.city} value={c.city}>
                          {c.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="city"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Например: Казань"
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+7 (900) 000-00-00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (необязательно)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Удобный мессенджер</Label>
                  <Select
                    value={messengerType}
                    onValueChange={v => setMessengerType(v as MessengerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSENGERS.map(m => (
                        <SelectItem key={m} value={m}>
                          {MESSENGER_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {messengerType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="handle">Ник или ссылка</Label>
                    <Input
                      id="handle"
                      value={messengerHandle}
                      onChange={e => setMessengerHandle(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-100 bg-sky-50/50">
            <CardContent className="space-y-4 pt-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  checked={consentPd}
                  onCheckedChange={v => setConsentPd(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  Согласен на обработку персональных данных для записи на приём
                  — обязательно
                  <span className="text-red-600"> *</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  checked={consentMarketing}
                  onCheckedChange={v => setConsentMarketing(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  Разрешаю написать мне в выбранный мессенджер и присылать
                  информацию об услугах и акциях. Отозвать согласие можно в
                  любой момент.
                </span>
              </label>
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                Без второй галочки мы позвоним по указанному телефону и не будем
                писать в мессенджеры.
              </p>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submit.isPending}
          >
            <Phone className="mr-2 h-4 w-4" />
            {submit.isPending ? "Отправляем…" : "Записаться на приём"}
          </Button>

          {selectedService && (
            <p className="text-center text-sm text-slate-600">
              По этой заявке: {selectedService.leadMagnet}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
