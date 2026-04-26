import type { MDXComponents } from 'mdx/types';

/**
 * Wraps every MDX page in a constrained `prose` container so blog posts
 * land with consistent typography. App-Router convention requires this
 * file at the project root (or src) and an exported function named
 * `useMDXComponents`.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    wrapper: (props) => (
      <article className="mx-auto max-w-3xl px-6 py-20 prose">{props.children}</article>
    ),
    ...components,
  };
}
