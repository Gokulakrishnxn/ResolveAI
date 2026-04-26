'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useInboxStream } from '@/lib/use-inbox-stream';

export function InboxRealtime(): JSX.Element {
  const router = useRouter();
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useInboxStream((event) => {
    setLastEvent(event.type);
    router.refresh();
  });

  useEffect(() => {
    if (!lastEvent) return;
    const id = setTimeout(() => setLastEvent(null), 4000);
    return () => clearTimeout(id);
  }, [lastEvent]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-muted-foreground">Live</span>
      {lastEvent ? <Badge variant="success">{lastEvent}</Badge> : null}
    </div>
  );
}
