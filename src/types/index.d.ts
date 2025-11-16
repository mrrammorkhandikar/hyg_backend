export type BlogPost = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  date: string;
  tags?: string[];
  image?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  affiliateLinks?: string[];
  googleAds?: boolean;
};
