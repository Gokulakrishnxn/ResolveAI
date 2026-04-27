import { BookOpen, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  const totalChunks = docs.reduce((acc, d) => acc + d.chunks, 0);

  return (
    <>
      <SiteHeader title="Knowledge" />

      <PageHeader
        eyebrow="RAG sources"
        title="Knowledge base"
        description="Upload policies, FAQs and shipping info. ResolveAI cites these documents in replies."
        actions={
          <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
            <BookOpen className="size-3.5" />
            {docs.length} {docs.length === 1 ? 'document' : 'documents'} · {totalChunks} chunks
          </Badge>
        }
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Add a document</CardTitle>
                <CardDescription>
                  Documents are chunked into ~800-char windows, embedded with{' '}
                  <span className="font-mono text-[12px] text-foreground/80">
                    text-embedding-3-small
                  </span>{' '}
                  and indexed in pgvector.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeUploader />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Indexed documents</CardTitle>
                <CardDescription>
                  Cited at reply time when the question matches a stored chunk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 px-6 py-12 text-center">
                    <FileText className="size-6 text-muted-foreground/70" />
                    <p className="text-sm text-foreground">No documents yet.</p>
                    <p className="text-xs text-muted-foreground">
                      Add your first FAQ or policy to start grounding replies.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-start gap-3 bg-card/40 px-4 py-3 transition-colors hover:bg-secondary/40"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-secondary/40">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {d.source.toLowerCase()} · {d.chunks} chunks
                            {d.url ? (
                              <>
                                {' · '}
                                <span className="font-mono text-[11px] text-muted-foreground/80">
                                  {d.url}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {new Date(d.updatedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
