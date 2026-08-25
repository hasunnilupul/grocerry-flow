import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

export default function LogPage() {
  return (
    <>
      <PageHeader title="Log a trip" subtitle="Record what you just bought" />
      <EmptyState
        title="Trip entry lands next"
        body="The fast entry form — date, store, and one row per item with quantity and price — is the next thing being built."
      />
    </>
  );
}
