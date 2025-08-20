// Type for import.meta.glob
interface ImportMeta {
  glob: (pattern: string, options?: { eager?: boolean; import?: string }) => Record<string, any>;
}
declare module '*.mdx' {
  export const meta: any;
  const ReactComponent: (props: any) => JSX.Element;
  export default ReactComponent;
}
/// <reference types="vite/client" />
