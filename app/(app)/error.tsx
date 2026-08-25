"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Most failures in this app are one of two things: the database isn't
 *  configured yet, or the connection dropped. Say which, instead of showing a
 *  blank screen. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isSetupProblem = error.message.includes("DATABASE_URL");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isSetupProblem ? "Database not connected yet" : "Something broke"}
        </CardTitle>
        <CardDescription>
          {isSetupProblem
            ? "Copy .env.example to .env.local, paste your Postgres connection string, then run pnpm db:migrate."
            : "That request didn't go through. Try again — if it keeps failing, check the database is reachable."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={reset} className="h-12 px-5">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
