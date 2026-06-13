"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import { ShoppingCart, Check, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

export default function ListasPage() {
  const supabase = createClient();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("shopping_lists")
      .select("*, shopping_list_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLists(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("shopping_lists").insert({
      user_id: user?.id,
      name: newListName,
      is_completed: false,
      is_private: false,
    });
    setNewListName("");
    setModalOpen(false);
    load();
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    await supabase
      .from("shopping_list_items")
      .update({ is_checked: !checked })
      .eq("id", itemId);
    load();
  };

  const handleDeleteList = async (id: string) => {
    await supabase.from("shopping_lists").delete().eq("id", id);
    load();
  };

  const activeLists = lists.filter((l) => !l.is_completed);
  const completedLists = lists.filter((l) => l.is_completed);

  return (
    <div>
      <Header title="Listas de Compras" subtitle="Suas listas criadas pela Iasmin" />

      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Nova Lista
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : activeLists.length === 0 ? (
          <Card>
            <div className="py-10 text-center">
              <ShoppingCart className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhuma lista de compras</p>
              <p className="text-xs text-dark-600 mt-1">
                Diga: "Iasmin, cria lista de compras: arroz, feijão e leite"
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLists.map((list) => {
              const items = list.shopping_list_items || [];
              const checked = items.filter((i: any) => i.is_checked).length;
              const isExpanded = expanded === list.id;

              return (
                <Card key={list.id}>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpanded(isExpanded ? null : list.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-4 h-4 text-primary-500" />
                      <div>
                        <p className="text-sm font-semibold text-dark-100">
                          {list.name}
                        </p>
                        <p className="text-xs text-dark-400">
                          {checked}/{items.length} itens •{" "}
                          {formatRelativeDate(list.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {items.length > 0 && (
                        <div className="w-24 bg-dark-800 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(checked / items.length) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-dark-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-dark-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t border-dark-700 pt-4">
                      {items.length === 0 ? (
                        <p className="text-xs text-dark-500 text-center py-3">
                          Lista vazia
                        </p>
                      ) : (
                        items.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 py-1"
                          >
                            <button
                              onClick={() =>
                                handleToggleItem(item.id, item.is_checked)
                              }
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                item.is_checked
                                  ? "bg-primary-500 border-primary-500"
                                  : "border-dark-600 hover:border-primary-500"
                              }`}
                            >
                              {item.is_checked && (
                                <Check className="w-3 h-3 text-dark-950" />
                              )}
                            </button>
                            <span
                              className={`text-sm ${
                                item.is_checked
                                  ? "line-through text-dark-500"
                                  : "text-dark-100"
                              }`}
                            >
                              {item.name}
                              {item.quantity && (
                                <span className="text-dark-500 ml-1">
                                  ({item.quantity} {item.unit || "un"})
                                </span>
                              )}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className="text-xs text-dark-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir lista
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Lista">
        <div className="space-y-4">
          <Input
            label="Nome da lista"
            placeholder="Ex: Mercado semana"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleCreateList}>
              Criar Lista
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
