"use client";

import ExistSathyaOrderHistoryComponent from "../../components/exist_sathya_order_history/exist_sathya_order_history";

export default function SalesOrderHistoryPage() {
  return (
    <div>
      <ExistSathyaOrderHistoryComponent readOnly orderIdFilled />
    </div>
  );
}
