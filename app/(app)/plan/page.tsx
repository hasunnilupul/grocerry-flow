import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { currentMonthKey, formatMonth, nextMonthKey } from "@/lib/month";

export default function PlanPage() {
  const month = nextMonthKey(currentMonthKey());

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`Predicted list for ${formatMonth(month)}`}
      />
      <EmptyState
        title="Prediction lands after a month or two of history"
        body="Once trips are recorded, this page suggests next month's list from what you usually buy, and turns into a checklist while you shop."
      />
    </>
  );
}
