import CreateMapboxForm from "@/app/admin/components/mapbox/CreateMapboxForm";

// This component receives params directly
export default function EditStorePage({ params }) {
  const { storeId } = params; // Get the dynamic ID from the URL

  return (
    <div className="container mx-auto py-8">
      <CreateMapboxForm storeId={storeId} />
    </div>
  );
}