// ============================================================
// Página - Admin: Denúncias
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { CommunityReport } from '@/types/addiction';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // TODO: Criar endpoint GET /api/admin/reports
      console.log('Fetching reports...');
      setReports([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (reportId: string) => {
    if (!confirm('Tem certeza que quer deletar este post?')) return;

    setProcessingId(reportId);
    try {
      // TODO: Implementar API DELETE /api/admin/reports/{id}
      console.log('Deleting report:', reportId);
      setReports(reports.filter((r) => r.id !== reportId));
    } catch (err) {
      alert('Erro ao processar denúncia');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFalseReport = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      // TODO: Implementar API PATCH /api/admin/reports/{id}
      console.log('Marking as false report:', reportId);
      setReports(reports.filter((r) => r.id !== reportId));
    } catch (err) {
      alert('Erro ao marcar como falsa denúncia');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">🚩 Denúncias Pendentes</h1>
        <p className="text-gray-600 mt-2">Revise e modere conteúdo da comunidade</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Nenhuma denúncia pendente</p>
            <p className="text-sm text-gray-500 mt-2">
              A comunidade está bem comportada! 🎉
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {report.post_id ? '📝 Post' : '💬 Comentário'}
                    </CardTitle>
                    <CardDescription>
                      Denunciado há{' '}
                      {Math.floor(
                        (Date.now() - new Date(report.created_at).getTime()) /
                          (1000 * 60 * 60)
                      )}{' '}
                      horas
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">{report.reason}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Razão */}
                <div>
                  <p className="text-sm font-semibold mb-1">Motivo:</p>
                  <p className="text-sm text-gray-700 capitalize">
                    {report.reason.replace('_', ' ')}
                  </p>
                </div>

                {/* Detalhes da denúncia */}
                {report.reason_details && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Detalhes:</p>
                    <p className="text-sm text-gray-700">
                      {report.reason_details}
                    </p>
                  </div>
                )}

                {/* Conteúdo denunciado */}
                <div className="bg-white p-3 rounded border border-orange-100">
                  <p className="text-sm font-semibold mb-1">
                    {report.post_id ? 'Post denunciado:' : 'Comentário denunciado:'}
                  </p>
                  <p className="text-sm text-gray-700">
                    [Conteúdo será exibido aqui quando integrado com banco]
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleMarkFalseReport(report.id)}
                    disabled={processingId === report.id}
                  >
                    {processingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Denúncia Falsa
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeletePost(report.id)}
                    disabled={processingId === report.id}
                  >
                    {processingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Deletar Conteúdo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
