/**
 * Клиники-партнёры: кому агрегатор отдаёт заявки.
 *
 * Здесь только организации и их рабочие контакты по договору — персональных
 * данных пациентов на этой вкладке нет.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PARTNER_STATUS_LABELS } from "@shared/dental";
import { MILLION_CITIES, regionOf } from "@shared/cities";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PartnersPanel() {
  const utils = trpc.useUtils();
  const { data: partners, isLoading } = trpc.dental.partners.useQuery({});
  const { data: stats } = trpc.dental.partnerStats.useQuery({ days: 30 });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pricePerVisit, setPricePerVisit] = useState("");
  const [dailyCap, setDailyCap] = useState("");

  const refresh = () => {
    utils.dental.partners.invalidate();
    utils.dental.partnerStats.invalidate();
    utils.dental.cities.invalidate();
  };

  const createPartner = trpc.dental.createPartner.useMutation({
    onSuccess: () => {
      toast.success("Клиника добавлена");
      setOpen(false);
      setName("");
      setCity("");
      setContactPhone("");
      setContactEmail("");
      setPricePerVisit("");
      setDailyCap("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePartner = trpc.dental.updatePartner.useMutation({
    onSuccess: () => {
      toast.success("Обновлено");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statsById = new Map(
    (stats ?? []).filter(s => s.partnerId !== null).map(s => [s.partnerId, s])
  );
  const unrouted = (stats ?? []).find(s => s.partnerId === null);

  return (
    <div className="space-y-4">
      {unrouted && unrouted.leads > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">
            {unrouted.leads} заявок за 30 дней остались без клиники — в этих
            городах партнёра нет. Это список городов, куда стоит идти
            договариваться в первую очередь: спрос там уже оплачен.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4 text-sky-600" />
              Клиники-партнёры
            </CardTitle>
            <CardDescription>
              Заявка уходит клинике в своём городе. Между подходящими
              распределяется по наименьшей загрузке за сутки
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая клиника-партнёр</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Название</Label>
                  <Input
                    id="p-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Стоматология «Пример»"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-city">Город</Label>
                  <Input
                    id="p-city"
                    list="million-cities"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Казань"
                  />
                  {/* Миллионники подсказкой: регион подставится сам. */}
                  <datalist id="million-cities">
                    {MILLION_CITIES.map(c => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                  {regionOf(city) && (
                    <p className="text-xs text-slate-500">
                      Регион: {regionOf(city)}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-phone">Телефон клиники</Label>
                    <Input
                      id="p-phone"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-email">E-mail</Label>
                    <Input
                      id="p-email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-price">Цена за приход, ₽</Label>
                    <Input
                      id="p-price"
                      inputMode="numeric"
                      value={pricePerVisit}
                      onChange={e => setPricePerVisit(e.target.value)}
                      placeholder="3000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-cap">Лимит заявок в сутки</Label>
                    <Input
                      id="p-cap"
                      inputMode="numeric"
                      value={dailyCap}
                      onChange={e => setDailyCap(e.target.value)}
                      placeholder="0 — без лимита"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={
                    name.trim().length < 2 ||
                    city.trim().length < 2 ||
                    createPartner.isPending
                  }
                  onClick={() =>
                    createPartner.mutate({
                      name: name.trim(),
                      city: city.trim(),
                      region: regionOf(city) ?? undefined,
                      contactPhone: contactPhone.trim() || undefined,
                      contactEmail: contactEmail.trim() || undefined,
                      pricePerVisit: Number(pricePerVisit) || undefined,
                      dailyCap: Number(dailyCap) || 0,
                    })
                  }
                >
                  {createPartner.isPending ? "Сохраняем…" : "Добавить клинику"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиника</TableHead>
                <TableHead>Город</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Лимит в сутки</TableHead>
                <TableHead>Цена за приход</TableHead>
                <TableHead>Заявок за 30 дней</TableHead>
                <TableHead>Дошли</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-slate-500"
                  >
                    Загружаем…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (partners ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-slate-500"
                  >
                    Клиник пока нет. Пока их нет, заявки будут копиться
                    нераспределёнными.
                  </TableCell>
                </TableRow>
              )}
              {(partners ?? []).map(partner => {
                const stat = statsById.get(partner.id);
                return (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      {partner.name}
                    </TableCell>
                    <TableCell>{partner.city}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {partner.contactPhone || "—"}
                      {partner.contactEmail && (
                        <div>{partner.contactEmail}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {partner.dailyCap > 0 ? partner.dailyCap : "без лимита"}
                    </TableCell>
                    <TableCell>{partner.pricePerVisit} ₽</TableCell>
                    <TableCell>{stat?.leads ?? 0}</TableCell>
                    <TableCell>{stat?.visited ?? 0}</TableCell>
                    <TableCell>
                      <Select
                        value={partner.status}
                        onValueChange={value =>
                          updatePartner.mutate({
                            id: partner.id,
                            status: value as "active" | "paused" | "archived",
                          })
                        }
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PARTNER_STATUS_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className={`mt-1 ${STATUS_STYLES[partner.status] ?? ""}`}
                      >
                        {PARTNER_STATUS_LABELS[partner.status] ??
                          partner.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
