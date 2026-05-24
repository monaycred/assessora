import { NextRequest, NextResponse } from "next/server";
import { getInstanceQRCode } from "@/lib/evolution/client";

// GET /api/whatsapp/instances/[name]/qr — obtém QR code
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const qr = await getInstanceQRCode(name);
    return NextResponse.json(qr);
  } catch (error) {
    console.error("[API] Erro ao obter QR:", error);
    return NextResponse.json({ error: "Erro ao obter QR code" }, { status: 500 });
  }
}
