import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ReviewFormProps {
  orderId: number;
  toUserId: number;
  onSuccess?: () => void;
}

export default function ReviewForm({ orderId, toUserId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Отзыв успешно отправлен");
      setComment("");
      setRating(5);
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Выберите рейтинг");
      return;
    }
    createReview.mutate({
      orderId,
      toUserId,
      rating,
      comment: comment || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Оставить отзыв</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating */}
        <div>
          <label className="text-sm font-medium block mb-2">Оценка</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium block mb-2">Комментарий (опционально)</label>
          <Textarea
            placeholder="Поделитесь своим опытом работы с этим исполнителем..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-24"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={createReview.isPending}
          className="w-full"
        >
          {createReview.isPending ? "Отправка..." : "Отправить отзыв"}
        </Button>
      </CardContent>
    </Card>
  );
}
