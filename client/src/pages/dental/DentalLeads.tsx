/**
 * Кабинет по заявкам DAREMA: очередь на связь, дневной отчёт и выгрузка в Excel.
 *
 * Очередь отсортирована по баллу срочности — сверху те, кому больно и кто готов
 * приехать сегодня. Кнопка сообщения доступна только по заявкам, где пациент
 * разрешил переписку.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Copy,
  Download,
  MessageSquare,
  Megaphone,
  Search,
  TimerOff,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DENTAL_SERVICES,
  LEAD_STATUS_LABELS,
  MESSENGER_LABELS,
  URGENCY_SHORT,
  getService,
  type LeadStatus,
  type MessengerType,
  type UrgencyTier,
} from "@shared/dental";
import { Switch } from "@/components/ui/switch";

const TIER_STYLES: Record<UrgencyTier, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
const TIERS: UrgencyTier[] = ["critical", "high", "medium", "low"];

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Подпись срока в очереди: сколько осталось или насколько просрочено. */
const slaLabel = (lead: {
  slaBreached: boolean;
  slaRunning: boolean;
  slaMinutesLeft: number;
  slaMinutes: number;
}) => {
  const abs = Math.abs(lead.slaMinutesLeft);
  const human = abs < 60 ? `${abs} мин` : `${Math.round(abs / 60)} ч`;
  if (lead.slaBreached) return `просрочено на ${human}`;
  if (!lead.slaRunning) return `связались в срок`;
  return `осталось ${human}`;
};

export default function DentalLeads() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [serviceSlug, setServiceSlug] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [messageLead, setMessageLead] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageChannel, setMessageChannel] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : (status as LeadStatus),
      urgencyTier: tier === "all" ? undefined : (tier as UrgencyTier),
      serviceSlug: serviceSlug === "all" ? undefined : serviceSlug,
      search: search.trim() || undefined,
      overdueOnly: overdueOnly || undefined,
      limit: 100,
      offset: 0,
    }),
    [status, tier, serviceSlug, search, overdueOnly]
  );

  const { data, isLoading } = trpc.dental.list.useQuery(filters);
  const { data: dailyStats } = trpc.dental.dailyStats.useQuery({ days: 30 });
  const { data: campaignStats } = trpc.dental.campaignStats.useQuery({
    days: 30,
  });
  const { data: overdue } = trpc.dental.overdueCount.useQuery(undefined, {
    // Просрочка считается от текущего времени, поэтому счётчик надо освежать.
    refetchInterval: 60_000,
  });

  const setStatusMutation = trpc.dental.setStatus.useMutation({
    onSuccess: () => {
      toast.success("Статус обновлён");
      utils.dental.list.invalidate();
      utils.dental.dailyStats.invalidate();
      utils.dental.overdueCount.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markContacted = trpc.dental.markContacted.useMutation({
    onSuccess: () => {
      toast.success("Касание зафиксировано");
      utils.dental.list.invalidate();
      utils.dental.overdueCount.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openMessage = async (lead: { id: number; name: string }) => {
    try {
      const result = await utils.dental.firstTouchMessage.fetch({
        id: lead.id,
      });
      setMessageText(result.text);
      setMessageChannel(result.channel);
      setMessageLead(lead);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await utils.dental.exportXlsx.fetch({
        status: filters.status,
        urgencyTier: filters.urgencyTier,
        serviceSlug: filters.serviceSlug,
      });
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);

      if (result.omittedDays.length > 0) {
        toast.warning(
          `Выгружено ${result.totalLeads} заявок. Вкладок больше 60 — дни ${result.omittedDays.length} шт. остались только на листе «Все лиды».`
        );
      } else {
        toast.success(`Выгружено ${result.totalLeads} заявок`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const leads = data?.items ?? [];
  const criticalCount = leads.filter(l => l.urgencyTier === "critical").length;
  const todayStats = dailyStats?.[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Заявки DAREMA</h1>
            <p className="text-sm text-slate-500">
              Очередь на связь: сверху те, кому нужнее всего и кто готов
              приехать раньше
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Готовим файл…" : "Выгрузить в Excel"}
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4 text-sky-600" />}
            label="Заявок в выборке"
            value={data?.total ?? 0}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            label="Критичных сейчас"
            value={criticalCount}
          />
          <StatCard
            icon={<TimerOff className="h-4 w-4 text-red-600" />}
            label="Просрочено по SLA"
            value={overdue?.total ?? 0}
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4 text-emerald-600" />}
            label="Дошли до клиники"
            value={todayStats?.visited ?? 0}
          />
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Очередь</TabsTrigger>
            <TabsTrigger value="report">Отчёт по дням</TabsTrigger>
            <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Имя, телефон, ник, номер заявки"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Срочность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любая срочность</SelectItem>
                    {TIERS.map(t => (
                      <SelectItem key={t} value={t}>
                        {URGENCY_SHORT[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={serviceSlug} onValueChange={setServiceSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Услуга" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все услуги</SelectItem>
                    {DENTAL_SERVICES.map(s => (
                      <SelectItem key={s.slug} value={s.slug}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm sm:col-span-2 lg:col-span-4">
                  <Switch
                    checked={overdueOnly}
                    onCheckedChange={setOverdueOnly}
                  />
                  Только просроченные по SLA
                  {(overdue?.total ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-100 text-red-800"
                    >
                      {overdue?.total}
                    </Badge>
                  )}
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Срочность</TableHead>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Услуга</TableHead>
                      <TableHead>Связь</TableHead>
                      <TableHead>Источник</TableHead>
                      <TableHead>Создана</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-slate-500"
                        >
                          Загружаем заявки…
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && leads.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-slate-500"
                        >
                          Заявок пока нет. Как только пойдёт трафик на форму
                          записи, они появятся здесь.
                        </TableCell>
                      </TableRow>
                    )}
                    {leads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              TIER_STYLES[lead.urgencyTier as UrgencyTier]
                            }
                          >
                            {URGENCY_SHORT[lead.urgencyTier as UrgencyTier]} ·{" "}
                            {lead.urgencyScore}
                          </Badge>
                          <div
                            className={
                              lead.slaBreached
                                ? "mt-1 text-xs font-medium text-red-600"
                                : "mt-1 text-xs text-slate-400"
                            }
                          >
                            {slaLabel(lead)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-slate-500">
                            {lead.phone}
                          </div>
                          <div className="text-xs text-slate-400">
                            {lead.publicId}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getService(lead.serviceSlug)?.name ??
                            lead.serviceSlug}
                        </TableCell>
                        <TableCell className="text-sm">
                          {
                            MESSENGER_LABELS[
                              lead.messengerType as MessengerType
                            ]
                          }
                          {lead.messengerHandle && (
                            <div className="text-xs text-slate-500">
                              {lead.messengerHandle}
                            </div>
                          )}
                          {!lead.contactable && (
                            <div className="text-xs text-slate-400">
                              переписка не разрешена
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {[lead.sourceChannel, lead.utmCampaign]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDateTime(lead.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.status}
                            onValueChange={value =>
                              setStatusMutation.mutate({
                                id: lead.id,
                                status: value as LeadStatus,
                              })
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s} value={s}>
                                  {LEAD_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!lead.contactable}
                            title={
                              lead.contactable
                                ? "Подготовить сообщение"
                                : "Пациент не разрешил переписку — звоните по телефону"
                            }
                            onClick={() =>
                              openMessage({ id: lead.id, name: lead.name })
                            }
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Лиды по дням</CardTitle>
                <CardDescription>
                  Столько заявок передано в клинику за каждый день и столько из
                  них дошло до приёма
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Лидов</TableHead>
                      <TableHead>Критичных</TableHead>
                      <TableHead>Записаны</TableHead>
                      <TableHead>Дошли</TableHead>
                      <TableHead>Конверсия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dailyStats ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-slate-500"
                        >
                          Данных пока нет
                        </TableCell>
                      </TableRow>
                    )}
                    {(dailyStats ?? []).map(row => (
                      <TableRow key={row.day}>
                        <TableCell className="font-medium">{row.day}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.critical}</TableCell>
                        <TableCell>{row.scheduled}</TableCell>
                        <TableCell>{row.visited}</TableCell>
                        <TableCell>
                          {row.total > 0
                            ? Math.round((row.visited / row.total) * 100)
                            : 0}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-4 w-4 text-sky-600" />
                  Кампании за 30 дней
                </CardTitle>
                <CardDescription>
                  Клиника платит за приход, поэтому кампании сравниваются по
                  доле дошедших до приёма, а не по числу заявок
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Источник</TableHead>
                      <TableHead>Кампания</TableHead>
                      <TableHead>Заявок</TableHead>
                      <TableHead>Записаны</TableHead>
                      <TableHead>Дошли</TableHead>
                      <TableHead>Доля приходов</TableHead>
                      <TableHead>Доля критичных</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(campaignStats ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-10 text-center text-slate-500"
                        >
                          Пока нет заявок с метками кампаний
                        </TableCell>
                      </TableRow>
                    )}
                    {(campaignStats ?? []).map(row => (
                      <TableRow key={`${row.channel}:${row.campaign}`}>
                        <TableCell>{row.channel}</TableCell>
                        <TableCell className="font-medium">
                          {row.campaign}
                        </TableCell>
                        <TableCell>{row.leads}</TableCell>
                        <TableCell>{row.scheduled}</TableCell>
                        <TableCell>{row.visited}</TableCell>
                        <TableCell>
                          {row.leads > 0
                            ? Math.round((row.visited / row.leads) * 100)
                            : 0}
                          %
                        </TableCell>
                        <TableCell>{row.criticalShare}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={messageLead !== null}
        onOpenChange={open => !open && setMessageLead(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Сообщение для {messageLead?.name}</DialogTitle>
            <DialogDescription>
              Канал:{" "}
              {MESSENGER_LABELS[messageChannel as MessengerType] ??
                messageChannel}
              . Текст можно поправить перед отправкой.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Текст</Label>
              <Textarea
                id="message"
                rows={12}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(messageText);
                  toast.success("Текст скопирован");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Скопировать
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (!messageLead) return;
                  markContacted.mutate({
                    id: messageLead.id,
                    channel: messageChannel,
                    body: messageText,
                  });
                  setMessageLead(null);
                }}
              >
                Отправлено
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-lg bg-slate-100 p-2">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
