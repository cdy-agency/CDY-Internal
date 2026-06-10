export default function StubPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-8 text-center">
      <p className="text-cdy-muted">{title} — coming in Sprint 2</p>
    </div>
  );
}
