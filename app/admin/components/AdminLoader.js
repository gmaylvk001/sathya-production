export default function AdminLoader({ label = "Loading..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-brandRed" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
