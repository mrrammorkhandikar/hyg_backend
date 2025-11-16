export function suggestSeo(title: string, excerpt = '') {
  const maxTitle = title.length > 60 ? title.slice(0, 57) + '...' : title
  const description = excerpt || `${title} — Read expert guidance from Dr. Bushra Mirzah.`
  const keywords = title
    .toLowerCase()
    .split(/[\s-:,.]+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
  return {
    seo_title: maxTitle,
    seo_description: description,
    seo_keywords: keywords
  }
}
