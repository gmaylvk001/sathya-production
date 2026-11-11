"use client";

import React, { useRef, useMemo, useCallback, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";

import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/charmap";
import "tinymce/plugins/preview";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/directionality";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";

const isEmptyHtml = (html = "") =>
  String(html)
    .replace(/&nbsp;/gi, " ")
    .replace(/<p>(\s|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim() === "";

const TinyEditorInner = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value ?? "");
  const skipChangeRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value ?? "";
    const editor = editorRef.current;
    if (!editor || typeof editor.getContent !== "function") return;
    const current = editor.getContent({ format: "html" });
    if (current !== valueRef.current) {
      skipChangeRef.current = true;
      editor.setContent(valueRef.current);
    }
  }, [value]);

  const init = useMemo(
    () => ({
      height: 400,
      menubar: true,
      license_key: "gpl",
      plugins:
        "advlist autolink lists link image charmap preview anchor " +
        "searchreplace visualblocks code fullscreen " +
        "insertdatetime media table wordcount directionality",
      toolbar:
        "undo redo | formatselect | bold italic underline strikethrough | " +
        "alignleft aligncenter alignright alignjustify | " +
        "bullist numlist outdent indent | removeformat | code preview | ltr rtl",
      directionality: "ltr",
      branding: false,
      inline: false,
      skin: false,
      content_css: false,
      suffix: ".min",
      content_style:
        "body { font-family: Poppins, sans-serif; font-size:14px; direction: ltr; unicode-bidi: embed; }",
    }),
    []
  );

  const handleInit = useCallback((_evt, editor) => {
    editorRef.current = editor;
    const html = valueRef.current || "";
    if (html) {
      skipChangeRef.current = true;
      editor.setContent(html);
    }
  }, []);

  const handleEditorChange = useCallback((content) => {
    if (skipChangeRef.current) {
      skipChangeRef.current = false;
      return;
    }
    // TinyMCE often fires an empty change on init; do not wipe existing HTML
    if (isEmptyHtml(content) && !isEmptyHtml(valueRef.current)) {
      return;
    }
    if (typeof onChangeRef.current === "function") {
      onChangeRef.current({ target: { name: "description", value: content } });
    }
  }, []);

  return (
    <div className="my-4">
      <Editor
        apiKey=""
        onInit={handleInit}
        initialValue={value ?? ""}
        init={init}
        onEditorChange={handleEditorChange}
      />
    </div>
  );
};

export default TinyEditorInner;
