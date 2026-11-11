import { ReactElement } from "react";

export interface WarrantyItem {
  item_no?: string;
  name?: string;
  year?: number;
  price?: number;
  [key: string]: any;
}

export interface ProductInstallationWarrantySectionProps {
  /**
   * Current product object
   */
  product?: {
    _id?: string;
    name?: string;
    price?: number | string;
    special_price?: number | string;
    categoryName?: string;
    sub_category_new_name?: string;
    [key: string]: any;
  };
  /**
   * Available warranty plans from DB
   */
  warranties?: WarrantyItem[];
  /**
   * Extended warranty array from product or DB
   */
  extend_warranty?: { year: number; amount: number;[key: string]: any }[] | null;
  /**
   * Currently selected warranty plan object
   */
  selectedWarrantyData?: WarrantyItem | null;
  /**
   * Callback fired when a warranty plan is added or removed
   */
  onSelectWarranty?: (warranty: WarrantyItem | null, amount: number) => void;
  /**
   * Scoped class names
   */
  className?: string;
}

export default function ProductInstallationWarrantySection(
  props: ProductInstallationWarrantySectionProps
): ReactElement | null;
