export const metadata = {
  title: 'Get started · ResolveAI',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <div className="min-h-screen bg-muted/20">{children}</div>;
}
