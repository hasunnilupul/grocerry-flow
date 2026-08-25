import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          // Base UI composes via `render`, where shadcn/Radix used `asChild`.
          <Button className="mt-1 h-12 px-5" render={<Link href={actionHref} />}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
