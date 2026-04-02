interface FutureCardProps {
  version: string;
  title: string;
  body: string;
}

export function FutureCard({ version, title, body }: FutureCardProps) {
  return (
    <article className="future-card">
      <span className="future-card-version">{version}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
