import AllBrandsView from "@/components/brand/AllBrandsView";

export const metadata = {
  title: "All Brands - Shop Now",
  description:
    "Explore all official brand partners and authorized products at SATHYA Store. Shop home appliances and electronics from top brands like LG, Samsung, Haier, Sony, Voltas, Daikin, and more.",
  openGraph: {
    title: "All Brands - Shop Now | SATHYA Store",
    description:
      "Explore all official brand partners and authorized products at SATHYA Store.",
    type: "website",
  },
};

export default function AllBrandsPage() {
  return <AllBrandsView />;
}
