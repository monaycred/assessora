"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Heart, Check, Trash2, ExternalLink } from "lucide-react";

const PRIORITY_LABELS = { low: "Baixa", medium: "Média", high: "Alta" };
const PRIORITY_VARIANTS: Record<string, "default" | "warning" | "danger"> = {
  low: "default",
  medium: "warning",
  high: "danger",
};

export default function DesejosPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePurchased = async (id: string) => {
    await supabase.from("wishlist_items").update({ is_purchased: true }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    load();
  };

  const pending = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  return (
    <div>
      <Header title="Lista de Desejos" subtitle="Itens que você quer comprar" />

      <div className="p-6 space-y-5">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : pending.length === 0 ? (
          <Card>
            <div className="py-10 text-center">
              <Heart className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Lista de desejos vazia</p>
              <p className="text-xs text-dark-600 mt-1">
                Diga: "Iasmin, adiciona Air Fryer na minha lista de desejos"
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-dark-100">{item.name}</p>
                  </div>
                  <Badge variant={PRIORITY_VARIANTS[item.priority] || "default"}>
                    {PRIORITY_LABELS[item.priority as keyof typeof PRIORITY_LABELS] || item.priority}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-xs text-dark-400 mb-3">{item.description}</p>
                )}

                {item.estimated_price && (
                  <p className="text-base font-bold text-primary-500 mb-2">
                    ~{formatCurrency(item.estimated_price)}
                  </p>
                )}

                <p className="text-xs text-dark-500 mb-4">
                  {formatRelativeDate(item.created_at)}
                </p>

                <div className="flex gap-2 mt-auto">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePurchased(item.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Comprei!
                  </Button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {purchased.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-dark-400 mb-3">
              Comprados ({purchased.length})
            </h3>
            <div className="space-y-2">
              {purchased.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0 opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <p className="text-sm text-dark-300 line-through">{item.name}</p>
                  </div>
                  <button onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-dark-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
