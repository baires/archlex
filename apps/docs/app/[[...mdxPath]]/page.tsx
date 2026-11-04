import type { Metadata } from "next";
import { generateStaticParamsFor, importPage } from "nextra/pages";
import type { ReactElement } from "react";
import { buildPageSeo } from "../../lib/page-seo";
import { useMDXComponents as getMDXComponents } from "../../mdx-components";

export const generateStaticParams = generateStaticParamsFor("mdxPath");

type PageProps = {
  params: Promise<{ mdxPath?: string[] }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return buildPageSeo(metadata, params.mdxPath).metadata;
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(props: PageProps): Promise<ReactElement> {
  const params = await props.params;
  const {
    default: MDXContent,
    toc,
    metadata,
    sourceCode,
  } = await importPage(params.mdxPath);
  const seo = buildPageSeo(metadata, params.mdxPath);
  const content = <MDXContent {...props} params={params} />;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized from page metadata
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
      />
      {Wrapper ? (
        <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
          {content}
        </Wrapper>
      ) : (
        content
      )}
    </>
  );
}
