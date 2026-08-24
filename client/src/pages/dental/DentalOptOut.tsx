/**
 * Отзыв согласия по номеру заявки.
 *
 * Право отозвать согласие даёт 152-ФЗ, и оно должно работать без звонков и
 * переписки: человек вводит номер заявки из подтверждения — и мы перестаём
 * ему писать.
 */

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, ShieldOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DentalOptOut() {
  const search = useSearch();
  const [publicId, setPublicId] = useState("");
  const [done, setDone] = useState(false);

  // Ссылка «отписаться» из сообщения сразу подставляет номер заявки.
  useEffect(() => {
    const fromLink = new URLSearchParams(search).get("id");
    if (fromLink) setPublicId(fromLink);
  }, [search]);

  const optOut = trpc.dental.optOut.useMutation({
    onSuccess: () => setDone(true),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <Card className="w-full max-w-md">
        {done ? (
          <>
            <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <CardTitle className="mt-4">Согласие отозвано</CardTitle>
              <CardDescription>
                Мы больше не будем писать вам по этой заявке.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Если вы всё же захотите записаться на приём — оставьте новую
              заявку на странице записи, это ни к чему вас не обязывает.
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <ShieldOff className="h-10 w-10 text-slate-400" />
              <CardTitle className="mt-3">Отозвать согласие</CardTitle>
              <CardDescription>
                Введите номер заявки — он указан в подтверждении и в сообщении
                от администратора.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publicId">Номер заявки</Label>
                <Input
                  id="publicId"
                  value={publicId}
                  onChange={e => setPublicId(e.target.value)}
                  placeholder="DL-XXXXXXXX"
                />
              </div>
              <Button
                className="w-full"
                disabled={publicId.trim().length < 3 || optOut.isPending}
                onClick={() => optOut.mutate({ publicId: publicId.trim() })}
              >
                {optOut.isPending ? "Отправляем…" : "Больше не писать мне"}
              </Button>
              <p className="text-xs text-slate-500">
                Отзыв касается рекламных сообщений. Если вы записаны на приём,
                администратор всё же позвонит, чтобы подтвердить или отменить
                визит.
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
