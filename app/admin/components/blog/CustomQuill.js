import React, { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ReactDOM from "react-dom";
import "react-quill/dist/quill.snow.css";

// Programmatic patch for React 18 back-compatibility 
if (typeof window !== "undefined" && !ReactDOM.findDOMNode) {
  ReactDOM.findDOMNode = (componentOrElement) => {
    if (!componentOrElement) return null;
    if (componentOrElement instanceof HTMLElement) return componentOrElement;
    if (componentOrElement.getEditor) {
      return componentOrElement.editingArea || componentOrElement.editor?.root?.parentElement || null;
    }
    return null;
  };
}

// Wrap legacy dependency using Next.js Dynamic with SSR fully turned off
const ReactQuillBackend = dynamic(
  () => import("react-quill"),
  { 
    ssr: false,
    loading: () => <div className="h-40 border border-gray-200 bg-gray-50 animate-pulse rounded-md w-full" />
  }
);

const CustomQuill = ({ value, onChange }) => {
  const quillRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && quillRef.current) {
      // Overriding getEditingArea() to return a safe container fallback
      if (typeof quillRef.current.getEditingArea !== "function") {
        quillRef.current.getEditingArea = function () {
          return quillRef.current.editingArea || document.createElement('div');
        };
      }

      // Safe initialization of editor instance features
      if (typeof quillRef.current.getEditor === "function") {
        const editor = quillRef.current.getEditor();
        editor.root.setAttribute("spellcheck", "false");
      }
    }
  }, [isMounted]);

  if (!isMounted) {
    return <div className="h-40 border border-gray-200 bg-gray-50 rounded-md w-full" />;
  }

  return (
    <ReactQuillBackend
      ref={quillRef}
      value={value || ""}
      onChange={onChange}
      modules={{
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
      }}
    />
  );
};

export default CustomQuill;