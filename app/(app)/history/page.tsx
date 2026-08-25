import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="History" subtitle="Month by month" />
      <EmptyState
        title="No months to compare yet"
        body="Recorded months show up here with their totals, so you can see what changed."
        actionLabel="Log a trip"
        actionHref="/log"
      />
    </>
  );
}
