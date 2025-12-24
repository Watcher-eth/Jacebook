import { CustomHead } from "@/components/layout/CustomHead"
import { lucidaGrant } from "@/lib/font"
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return (
    <main className={lucidaGrant.variable}>
      <CustomHead router={router} pageProps={pageProps} />
      <Component {...pageProps} />
    </main>
  )
}
