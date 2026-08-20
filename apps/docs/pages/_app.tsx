import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import "@archlex/design";
import "../styles/nextra-overrides.css";

const SITE_ORIGIN = "https://docs.archlex.dev";

export default function App({ Component, pageProps }: AppProps) {
  const { asPath } = useRouter();
  // next.config.mjs sets trailingSlash: true, so canonical URLs always end in "/"
  const path = asPath.split(/[?#]/)[0];
  const canonical = `${SITE_ORIGIN}${path.endsWith("/") ? path : `${path}/`}`;

  return (
    <>
      <Head>
        <link rel="canonical" href={canonical} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
