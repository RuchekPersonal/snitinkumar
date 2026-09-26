export type Role = "guest" | "pending" | "approved" | "admin";

export interface Viewer {
  role: Role;
  retailerId?: string;
  status?: "pending" | "approved" | "rejected" | "blocked";
  name?: string;
  shopName?: string;
  city?: string;
  phone?: string;
}

export interface Category {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  showOnHome: boolean;
  coverImageId: string | null;
  designCount: number;
}

// What any visitor may see. Never carries price fields.
export interface ProductCard {
  code: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  fabric: string;
  colour: string;
  sizes: string[];
  moq: number;
  inStock: boolean;
  isNew: boolean;
  coverImageId: string | null;
  /** Present only when the viewer is allowed to see prices. */
  ratePaise?: number;
}

export interface ProductDetail extends ProductCard {
  description: string;
  work: string;
  lengthIn: number | null;
  setIncludes: string;
  washCare: string;
  imageIds: string[];
  /** All colourways this design is available in (primary first). */
  availableColours: { name: string; hex: string | null }[];
}

export interface CatalogFilters {
  category?: string;
  fabric?: string;
  colour?: string;
  size?: string;
  maxRate?: number; // rupees
  newOnly?: boolean;
  q?: string;
  sort?: "newest" | "popular" | "price-asc" | "price-desc";
  page?: number;
}

export interface CatalogPage {
  items: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
}

export interface EnquiryLine {
  code: string;
  qty: number;
}
