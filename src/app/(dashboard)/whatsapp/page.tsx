"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/utils";
import { Phone, Plus, Trash2, CheckCircle, MessageSquare } from "lucide-react";

export default function WhatsAppPage() {
  const supabase = createClient();
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNumbers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("authorized_whatsapp_numbers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNumbers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadNumbers();
  }, []);

  const handleAdd = async () => {
    if (!newNumber) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cleaned = newNumber.replace(/\D/g, "");

      await supabase.from("authorized_whatsapp_numbers").insert({
        user_id: user?.id,
        phone_number: cleaned,
        label: newLabel || null,
        is_active: true,
        authorized_at: new Date().toISOString(),
      });

      await loadNumbers();
      setModalOpen(false);
      setNewNumber("");
      setNewLabel("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("authorized_whatsapp_numbers").delete().eq("id", id);
    loadNumbers();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase
      .from("authorized_whatsapp_numbers")
      .update({ is_active: !current })
      .eq("id", id);
    loadNumbers();
  };

  return (
    <div>
      <Header
        title="WhatsApp Autorizado"
        subtitle="Gerencie os números que podem usar a Iasmin"
      />

      <div className="p-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white">
                Números Autorizados
              </h3>
            </div>
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : numbers.length === 0 ? (
            <div className="py-10 text-center">
              <Phone className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-400">Nenhum número cadastrado</p>
              <p className="text-xs text-dark-600 mt-1">
                Adicione seu WhatsApp para usar a Iasmin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {numbers.map((num) => (
                <div
                  key={num.id}
                  className="flex items-center justify-between p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        num.is_active
                          ? "bg-green-500/10 border border-green-500/20"
                          : "bg-dark-700 border border-dark-600"
                      }`}
                    >
                      <Phone
                        className={`w-4 h-4 ${
                          num.is_active ? "text-green-400" : "text-dark-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatPhone(num.phone_number)}
                      </p>
                      {num.label && (
                        <p className="text-xs text-dark-400">{num.label}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={num.is_active ? "success" : "default"} dot>
                      {num.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <button
                      onClick={() => handleToggle(num.id, num.is_active)}
                      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors text-xs"
                    >
                      {num.is_active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => handleDelete(num.id)}
                      className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adicionar Número"
      >
        <div className="space-y-4">
          <Input
            label="Número WhatsApp"
            placeholder="5511999999999"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            hint="Formato: código do país + DDD + número (ex: 5511999999999)"
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Etiqueta (opcional)"
            placeholder="Ex: Meu WhatsApp pessoal"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button fullWidth loading={saving} onClick={handleAdd}>
              <CheckCircle className="w-4 h-4" />
              Autorizar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
