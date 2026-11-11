/**
 * Stock Engine — combo stock → product stock_status
 */

export function resolveStockStatus(comboStock) {
  const qty = Math.max(0, Number(comboStock) || 0);
  return {
    quantity: qty,
    stock_status: qty > 0 ? "In Stock" : "Out of Stock",
    comboStatus: qty > 0 ? null : "out_of_stock",
  };
}

export function applyStockToCombo(combo) {
  const { quantity, stock_status, comboStatus } = resolveStockStatus(
    combo.comboStock
  );
  if (comboStatus && combo.status === "active") {
    combo.status = "out_of_stock";
  }
  return { quantity, stock_status, status: combo.status };
}
