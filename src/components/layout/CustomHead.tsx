import React from "react";
import { NextSeo } from "next-seo";

const SITE_URL = "https://jacebook.vercel.app"; 
const DEFAULT_OG = `${SITE_URL}/PreviewOG.png`; 
const DEFAULT_TWITTER_INFO = {
  handle: "@jacebook",
  site: "@jacebook",
  cardType: "summary_large_image",
};

export function CustomHead({ router, pageProps }: { router: any; pageProps?: any }) {
  const path = router?.pathname || "";
  const asPath = router?.asPath || "";

  let headSeo: React.ReactNode = <HomeSeo />;

  if (asPath === "/") {
    headSeo = <HomeSeo />;
  } else if (path.startsWith("/u/")) {
    headSeo = <ProfileSeo router={router} pageProps={pageProps} />;
  } else if (path.startsWith("/c/")) {
    headSeo = <CommunitySeo router={router} />;
  } else {
    headSeo = <HomeSeo />;
  }

  return <>{headSeo}</>;
}

function HomeSeo() {
  const title = "Jacebook";
  const description = "Explore documents, people, and communities.";
  const ogImageUrl = DEFAULT_OG;

  return (
    <NextSeo
      title={title}
      description={description}
      canonical={SITE_URL}
      openGraph={{
        url: SITE_URL,
        title,
        description,
        site_name: "Jacebook",
        type: "website",
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Jacebook" }],
      }}
      twitter={{
        ...DEFAULT_TWITTER_INFO,
        cardType: "summary_large_image",
      }}
    />
  );
}

function ProfileSeo({ router, pageProps }: { router: any; pageProps?: any }) {
  const slug = router?.query?.slug || router?.query?.[0] || ""; // supports odd configs
  const name = pageProps?.name || pageProps?.wikidataName || (slug ? titleCase(String(slug)) : "Profile");

  const title = `Jacebook`;
  const description = `See ${name} on Jacebook`;

  const ogImageUrl = DEFAULT_OG;

  const url = `${SITE_URL}/u/${encodeURIComponent(String(slug))}`;

  return (
    <NextSeo
      title={title}
      description={description}
      canonical={url}
      openGraph={{
        url,
        title,
        description,
        site_name: "Jacebook",
        type: "profile",
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: name }],
      }}
      twitter={{
        ...DEFAULT_TWITTER_INFO,
        cardType: "summary_large_image",
      }}
    />
  );
}

function CommunitySeo({ router }: { router: any }) {
  const type = String(router?.query?.type || "");
  const pretty = type ? titleCase(type) : "Community";

  const title = `Jacebook`;
  const description = `Explore ${pretty} on Jacebook`;

  const url = `${SITE_URL}/c/${encodeURIComponent(type)}`;
  const img = DEFAULT_OG;

  return (
    <NextSeo
      title={title}
      description={description}
      canonical={url}
      openGraph={{
        url,
        title,
        description,
        site_name: "Jacebook",
        type: "website",
        images: [{ url: img, width: 1200, height: 630, alt: pretty }],
      }}
      twitter={{
        ...DEFAULT_TWITTER_INFO,
        cardType: "summary_large_image",
      }}
    />
  );
}

function titleCase(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}