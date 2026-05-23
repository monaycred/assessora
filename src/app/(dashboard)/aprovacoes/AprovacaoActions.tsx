"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Check, X } from "lucide-react";

export default function AprovacaoActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="danger"
        size="sm"
        loading={loading === "reject"}
        onClick={() => handleAction("reject")}
      >
        <X className="w-3.5 h-3.5" />
        Rejeitar
      </Button>
      <Button
        variant="primary"
        size="sm"
        loading={loading === "approve"}
        onClick={() => handleAction("approve")}
      >
        <Check className="w-3.5 h-3.5" />
        Aprovar
      </Button>
    </div>
  );
}
