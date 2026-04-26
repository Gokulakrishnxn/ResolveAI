import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { KnowledgeUploader } from './_components/knowledge-uploader';

export const dynamic = 'force-dynamic';

interface KnowledgeDoc {
  id: string;
  title: string;
  url: string | null;
  source: string;
  tags: string[];
  chunks: number;
  updatedAt: string;
}

export default async function KnowledgePage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  let docs: KnowledgeDoc[] = [];
  try {
    docs = await apiFetch<KnowledgeDoc[]>('/knowledge/docs', { storeId, userId });
  } catch {
    docs = [];
  }

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-muted-foreground">
          Upload policies, FAQs, and shipping info. ResolveAI cites these in replies.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Upload document</CardTitle>
          <CardDescription>
            Documents are chunked, embedded with text-embedding-3-small, and indexed in pgvector.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeUploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indexed documents</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.source} · {d.chunks} chunks
                      {d.url ? ` · ${d.url}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
