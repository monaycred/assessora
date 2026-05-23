import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/utils";
import { FileText, Image, File, Download, ExternalLink } from "lucide-react";

const TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  doc: FileText,
  spreadsheet: FileText,
  other: File,
};

export default async function DocumentosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Documentos" subtitle="Seus arquivos salvos pela Iasmin" />

      <div className="p-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-white">
              Todos os Documentos ({docs?.length || 0})
            </h3>
          </div>

          {!docs || docs.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum documento salvo</p>
              <p className="text-xs text-dark-600 mt-1">
                Envie documentos para a Iasmin no WhatsApp
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((doc: any) => {
                const Icon = TYPE_ICONS[doc.doc_type] || File;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.folder && (
                          <Badge variant="default" className="text-[10px]">
                            {doc.folder}
                          </Badge>
                        )}
                        <p className="text-xs text-dark-500">
                          {formatRelativeDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
