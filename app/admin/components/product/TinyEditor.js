"use client";

import dynamic from "next/dynamic";

/**
 * TinyMCE is large; load it only when the editor mounts so product create/edit
 * pages do not pull tinymce + plugins into the initial admin bundle.
 */
const TinyEditor = dynamic(() => import("./TinyEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="my-4 h-[400px] animate-pulse rounded bg-gray-100" aria-hidden />
  ),
});

export default TinyEditor;
