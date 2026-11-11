import { AdminNavLoadingOverlay } from "@/app/admin/components/AdminNavLoading";

export default function AdminPageShell({ children }) {
  return (
    <div className="relative min-h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      {children}
      <AdminNavLoadingOverlay />
    </div>
  );
}
