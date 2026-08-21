import type { AppProps } from "next/app";
import "@archlex/design";
import "../styles/nextra-overrides.css";

// SEO tags (title, description, canonical, Open Graph, Twitter cards, JSON-LD)
// are emitted per page by SeoHead via the theme's `main` wrapper — see
// components/seo-head.tsx and theme.config.tsx.
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
