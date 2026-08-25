import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Bottom padding clears the fixed nav plus the home-indicator inset. */}
      <main className="flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
