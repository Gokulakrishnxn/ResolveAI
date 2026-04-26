import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Resolve customer tickets while you sleep.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          ResolveAI plugs into Shopify and WooCommerce, classifies every ticket, and either
          auto-resolves it (refunds, replacements, tracking) or hands a perfect draft to your team.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </section>

      <section className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Auto-classify</CardTitle>
            <CardDescription>gpt-4o-mini tags intent, sentiment and urgency in milliseconds.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Refund? Where-is-my-order? Address change? Spam? Routed before a human even reads it.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Retrieve + draft</CardTitle>
            <CardDescription>RAG over your FAQs and past tickets. gpt-4o writes the reply.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every claim is grounded in your real policies — never made up.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Act</CardTitle>
            <CardDescription>Refund, replace, cancel, escalate — directly via Shopify/Woo.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Per-store rules decide what is auto-approved versus reviewed. Everything is audit-logged.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
