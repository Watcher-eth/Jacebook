import { lucidaGrant } from "@/lib/font"
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={lucidaGrant.variable}>
      <Component {...pageProps} />
    </main>
  )
}
