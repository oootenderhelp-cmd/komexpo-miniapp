import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Heart, Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import RatingStars from "./RatingStars";

interface KvorkaCardProps {
  id: number;
  title: string;
  price: number;
  image?: string;
  contractorName: string;
  contractorAvatar?: string;
  rating: number;
  reviews: number;
  category?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: number) => void;
}

export default function KvorkaCard({
  id,
  title,
  price,
  image,
  contractorName,
  contractorAvatar,
  rating,
  reviews,
  category,
  isFavorite = false,
  onFavoriteToggle,
}: KvorkaCardProps) {
  const [favorite, setFavorite] = useState(isFavorite);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    setFavorite(!favorite);
    onFavoriteToggle?.(id);
  };

  return (
    <Link href={`/kvorka/${id}`}>
      <Card className="hover:shadow-lg transition-all cursor-pointer h-full overflow-hidden group">
        {/* Image */}
        <div className="relative h-40 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 opacity-20" />
            </div>
          )}
          <button
            onClick={handleFavorite}
            className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <Heart className={`w-5 h-5 ${favorite ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>

        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <RatingStars rating={rating} size="sm" showText={false} />
            <span className="text-xs text-muted-foreground">({reviews})</span>
          </div>

          {/* Contractor */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {contractorName.charAt(0)}
            </div>
            <span className="text-xs text-muted-foreground truncate">{contractorName}</span>
          </div>

          {/* Category */}
          {category && <Badge variant="secondary" className="text-xs w-fit">{category}</Badge>}

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-bold text-lg text-primary">{price.toLocaleString("ru-RU")} ₽</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
