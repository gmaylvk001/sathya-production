import AdminLoader from "@/app/admin/components/AdminLoader";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <AdminLoader />
    </div>
  );
}
