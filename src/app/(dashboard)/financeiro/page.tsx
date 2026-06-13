"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import {
  DollarSign,
  TrendingDown,
  CreditCard,
  Filter,
  Download,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  mercado: "Mercado",
  restaurante: "Restaurante",
  saude: "Saúde",
  transporte: "Transporte",
  lazer: "Lazer",
  casa: "Casa",
  outros: "Outros",
};

const CATEGORY_COLORS: Record<string, "primary" | "info" | "warning" | "danger" | "success"> = {
  mercado: "primary",
  restaurante: "warning",
  saude: "info",
  transporte: "info",
  lazer: "success",
  casa: "primary",
  outros: "info",
};

export default function FinanceiroPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let query = supabase
      .from("expenses")
      .select("*, payment_methods(name, type)")
      .gte("expense_date", firstDay)
      .order("expense_date", { ascending: false });

    if (filter !== "all") {
      query = query.eq("category", filter);
    }

    const { data } = await query;
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, [filter]);

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
    const cat = e.category || "outros";
    acc[cat] = (acc[cat] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div>
      <Header
        title="Financeiro"
        subtitle={`${new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}`}
      />

      <div className="p-6 space-y-5">
        {/* Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="col-span-1 md:col-span-1 border-primary-500/20 bg-primary-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400 mb-1">Total do Mês</p>
                <p className="text-3xl font-bold text-dark-100">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-primary-500" />
              </div>
            </div>
          </Card>

          {/* Por categoria */}
          <Card className="col-span-1 md:col-span-2">
            <p className="text-xs text-dark-400 mb-3">Por Categoria</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).map(([cat, value]) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg"
                >
                  <span className="text-xs text-dark-300">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span className="text-xs font-semibold text-dark-100">
                    {formatCurrency(value as number)}
                  </span>
                </div>
              ))}
              {Object.keys(byCategory).length === 0 && (
                <p className="text-sm text-dark-500">Sem dados</p>
              )}
            </div>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-dark-100">Despesas</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-dark-100 focus:outline-none focus:border-primary-500/50"
              >
                <option value="all">Todas</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-10 text-center">
              <DollarSign className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhuma despesa este mês</p>
            </div>
          ) : (
            <div className="space-y-0">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-3 border-b border-dark-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-dark-400" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-100">{expense.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-dark-500">
                          {formatDate(expense.expense_date)}
                        </p>
                        {expense.payment_methods && (
                          <p className="text-xs text-dark-500">
                            • {expense.payment_methods.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={CATEGORY_COLORS[expense.category] || "default"}>
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </Badge>
                    <span className="text-sm font-semibold text-dark-100 min-w-[80px] text-right">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
