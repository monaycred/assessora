import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <main className="min-h-screen min-w-0 flex-1 pt-16 md:ml-60 md:pt-0">{children}</main>
    </div>
  );
}
