import type { AppProps } from "next/app";
import "@archlex/design";
import "../styles/nextra-overrides.css";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
