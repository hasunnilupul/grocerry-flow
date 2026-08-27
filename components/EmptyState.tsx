import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        {actionLabel && actionHref ? (
          // Styled as a button, but it is a navigation — so it stays a real
          // link and only borrows the classes. Handing it to Base UI's Button
          // would relabel it `role="button"` for anyone using a screen reader.
          <Link
            href={actionHref}
            className={cn(buttonVariants(), "mt-1 h-12 px-5")}
          >
            {actionLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
