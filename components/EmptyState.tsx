import Link from "next/link";

export default function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted">{body}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-1 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
