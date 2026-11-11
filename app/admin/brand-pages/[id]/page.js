"use client";

import PageBuilder from "../../components/category-pages/PageBuilder";

export default function BrandPageBuilderRoute() {
  return (
    <PageBuilder
      listHref="/admin/brand-pages"
      listLabel="Brand Settings"
    />
  );
}
