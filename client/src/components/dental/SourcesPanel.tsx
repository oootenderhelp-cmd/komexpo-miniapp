/**
 * Источники заявок: откуда они падают в систему.
 *
 * Каждый источник получает свой ключ. Ключ показывается один раз — в базе
 * лежит только его хеш, восстановить его нельзя, можно выпустить новый.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Radio } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_TYPES,
  type LeadSourceType,
} from "@shared/leadSources";
import { MILLION_CITIES } from "@shared/cities";

const copy = (text: string, what: string) => {
  navigator.clipboard.writeText(text);
  toast.success(what + " скопирован");
};

export default function SourcesPanel() {
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.dental.sources.useQuery();
  const { data: stats } = trpc.dental.sourceStats.useQuery({ days: 30 });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<LeadSourceType>("partner_site");
  const [domain, setDomain] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const createSource = trpc.dental.createSource.useMutation({
    onSuccess: result => {
      setIssuedKey(result.apiKey);
      setName("");
      setDomain("");
      setDefaultCity("");
      utils.dental.sources.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSource = trpc.dental.updateSource.useMutation({
    onSuccess: () => {
      toast.success("Обновлено");
      utils.dental.sources.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statsById = new Map(
    (stats ?? []).filter(s => s.sourceId !== null).map(s => [s.sourceId, s])
  );
  const ownForm = (stats ?? []).find(s => s.sourceId === null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const widgetSnippet = (key: string, city: string | null) =>
    `<script src="${origin}/api/lead-widget.js"\n  data-key="${key}"${city ? `\n  data-city="${city}"` : ""}\n  data-title="Записаться к стоматологу"></script>`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-4 w-4 text-sky-600" />
              Откуда падают заявки
            </CardTitle>
            <CardDescription>
              Своя форма записи, виджет на сайте партнёра, лид-форма ВК, Тильда,
              колл-трекинг. У каждого источника свой ключ и своя статистика
            </CardDescription>
          </div>
          <Dialog
            open={open}
            onOpenChange={next => {
              setOpen(next);
              if (!next) setIssuedKey(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Подключить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {issuedKey ? "Ключ источника" : "Новый источник заявок"}
                </DialogTitle>
              </DialogHeader>

              {issuedKey ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Скопируйте ключ сейчас. Он показывается один раз — в базе
                    хранится только его хеш.
                  </div>
                  <div className="space-y-2">
                    <Label>Ключ</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={issuedKey}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copy(issuedKey, "Ключ")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Код для вставки на сайт</Label>
                    <Textarea
                      readOnly
                      rows={4}
                      className="font-mono text-xs"
                      value={widgetSnippet(issuedKey, defaultCity || null)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        copy(
                          widgetSnippet(issuedKey, defaultCity || null),
                          "Код"
                        )
                      }
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Скопировать код виджета
                    </Button>
                  </div>
                  <Button className="w-full" onClick={() => setOpen(false)}>
                    Готово
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="s-name">Название</Label>
                    <Input
                      id="s-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Сайт клиники «Улыбка»"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип источника</Label>
                    <Select
                      value={type}
                      onValueChange={v => setType(v as LeadSourceType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCE_TYPES.map(t => (
                          <SelectItem key={t} value={t}>
                            {LEAD_SOURCE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="s-domain">Домен источника</Label>
                      <Input
                        id="s-domain"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        placeholder="clinic.ru"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-city">Город по умолчанию</Label>
                      <Input
                        id="s-city"
                        list="source-cities"
                        value={defaultCity}
                        onChange={e => setDefaultCity(e.target.value)}
                        placeholder="Казань"
                      />
                      <datalist id="source-cities">
                        {MILLION_CITIES.map(c => (
                          <option key={c.name} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Домен ограничивает, откуда принимаются заявки. Город
                    подставляется, если источник его не передаёт — например,
                    форма на сайте клиники одного города.
                  </p>
                  <Button
                    className="w-full"
                    disabled={name.trim().length < 2 || createSource.isPending}
                    onClick={() =>
                      createSource.mutate({
                        name: name.trim(),
                        type,
                        domain: domain.trim() || undefined,
                        defaultCity: defaultCity.trim() || undefined,
                      })
                    }
                  >
                    {createSource.isPending ? "Создаём…" : "Выпустить ключ"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Источник</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Домен</TableHead>
                <TableHead>Ключ</TableHead>
                <TableHead>Заявок за 30 дней</TableHead>
                <TableHead>Дошли</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Своя форма записи</TableCell>
                <TableCell className="text-sm">Страница /dental</TableCell>
                <TableCell className="text-xs text-slate-500">—</TableCell>
                <TableCell className="text-xs text-slate-500">
                  не нужен
                </TableCell>
                <TableCell>{ownForm?.leads ?? 0}</TableCell>
                <TableCell>{ownForm?.visited ?? 0}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-100 text-emerald-800"
                  >
                    Работает
                  </Badge>
                </TableCell>
              </TableRow>

              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-slate-500"
                  >
                    Загружаем…
                  </TableCell>
                </TableRow>
              )}

              {(sources ?? []).map(source => {
                const stat = statsById.get(source.id);
                return (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell className="text-sm">
                      {LEAD_SOURCE_LABELS[source.type as LeadSourceType] ??
                        source.type}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {source.domain || "любой"}
                      {source.defaultCity && <div>{source.defaultCity}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        dlk_{source.apiKeyPrefix}_…
                      </span>
                    </TableCell>
                    <TableCell>{stat?.leads ?? 0}</TableCell>
                    <TableCell>{stat?.visited ?? 0}</TableCell>
                    <TableCell>
                      <Select
                        value={source.status}
                        onValueChange={value =>
                          updateSource.mutate({
                            id: source.id,
                            status: value as "active" | "paused",
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Принимает</SelectItem>
                          <SelectItem value="paused">Отключён</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как подключить источник</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            <b>Сайт клиники или свой лендинг.</b> Вставьте код виджета перед
            закрывающим тегом body — на странице появится кнопка записи.
          </p>
          <p>
            <b>Тильда, Яндекс Формы, лид-формы ВК.</b> В настройках формы
            укажите вебхук{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              {origin}/api/lead-intake
            </code>{" "}
            и передайте ключ заголовком X-Api-Key. Названия полей система
            распознаёт сама.
          </p>
          <p>
            <b>Любая своя интеграция.</b> POST с JSON: имя, телефон, город,
            согласие. В ответе придёт номер заявки.
          </p>
          <p className="text-xs">
            Любой источник обязан передать подтверждение согласия на обработку
            данных — заявка без него не принимается. Это защищает и вас, и
            клинику, которая её купит.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
