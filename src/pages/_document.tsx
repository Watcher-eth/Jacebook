import { Html, Head, Main, NextScript } from "next/document";


export default function Document() {
  return (
    <Html lang="en">
      <Head >
        <title>Jacebook</title>
        <meta
          name="description"
          content="Explore photos, people, and communities from the Epstein Files"
        />
        <meta name="twitter:card" content="summary_large_image" />
        </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
