import { ReactElement } from "react";

export interface ProductOffersSectionProps {
  /**
   * The current product object with pricing & details
   */
  product?: {
    _id?: string;
    name?: string;
    price?: number | string;
    special_price?: number | string;
    slug?: string;
    categoryName?: string;
    sub_category_new_name?: string;
    [key: string]: any;
  };
  productId?: string | null;
  /**
   * Optional external control to trigger EMI plans modal
   */
  externalShowEmiModal?: boolean;
  /**
   * Optional callback when EMI plans modal closes
   */
  onExternalCloseEmiModal?: () => void;
  /**
   * Optional extra container CSS class
   */
  className?: string;
}

export default function ProductOffersSection(props: ProductOffersSectionProps): ReactElement;
export function EmiPlansModal(props: any): ReactElement;
export function BankOffersModal(props: any): ReactElement;
