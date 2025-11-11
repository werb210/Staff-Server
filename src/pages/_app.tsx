import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main style={{ fontFamily: "Inter, sans-serif", padding: "1rem" }}>
      <Component {...pageProps} />
    </main>
  );
}
