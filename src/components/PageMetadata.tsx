import type { PageMetadata as PageMetadataData } from "@/lib/metadata";

type PageMetadataProps = {
  metadata: PageMetadataData;
};

// React 19 hoists these elements into <head>. Next's Metadata API is not used because
// not-found and error do not support it (plan, D4).
export function PageMetadata({ metadata }: PageMetadataProps) {
  return (
    <>
      <title>{metadata.title}</title>
      {metadata.description !== undefined && (
        <meta name="description" content={metadata.description} />
      )}
      {metadata.openGraph !== undefined && (
        <>
          <meta property="og:title" content={metadata.openGraph.title} />
          <meta
            property="og:description"
            content={metadata.openGraph.description}
          />
        </>
      )}
    </>
  );
}
