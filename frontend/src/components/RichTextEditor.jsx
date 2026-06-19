import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Palette,
  Type as TypeIcon
} from "lucide-react";

const RichTextEditor = ({ value, onChange, label }) => {
  const { t } = useTranslation();
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    onChange(editorRef.current.innerHTML);
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Bold" },
    { icon: Italic, command: "italic", title: "Italic" },
    { icon: Underline, command: "underline", title: "Underline" },
    { divider: true },
    { icon: AlignLeft, command: "justifyLeft", title: "Align Left" },
    { icon: AlignCenter, command: "justifyCenter", title: "Align Center" },
    { icon: AlignRight, command: "justifyRight", title: "Align Right" },
    { divider: true },
    { icon: ListOrdered, command: "insertOrderedList", title: "Numbered List" },
    { icon: List, command: "insertUnorderedList", title: "Bullet List" },
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-[11px] font-black uppercase tracking-widest text-blue-600/80 ml-1">{label}</label>}
      <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all dark:bg-slate-800/50 dark:border-white/10">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 dark:bg-white/5 dark:border-white/10">
          <select 
            onChange={(e) => execCommand("fontName", e.target.value)}
            className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none dark:bg-slate-900 dark:border-white/10"
          >
            <option value="Arial">Arial</option>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>

          <select 
            onChange={(e) => execCommand("fontSize", e.target.value)}
            className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none dark:bg-slate-900 dark:border-white/10"
          >
            <option value="1">{t("font_small", "Small")}</option>
            <option value="3">{t("font_normal", "Normal")}</option>
            <option value="5">{t("font_large", "Large")}</option>
            <option value="7">{t("font_huge", "Huge")}</option>
          </select>

          <div className="w-px h-4 bg-slate-200 mx-1 dark:bg-white/10" />

          {toolbarButtons.map((btn, i) => (
            btn.divider ? (
              <div key={i} className="w-px h-4 bg-slate-200 mx-1 dark:bg-white/10" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => execCommand(btn.command)}
                className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 hover:text-blue-600 transition-all dark:text-slate-400 dark:hover:bg-white/10"
                title={btn.title}
              >
                <btn.icon className="h-3.5 w-3.5" />
              </button>
            )
          ))}

          <input 
            type="color" 
            onChange={(e) => execCommand("foreColor", e.target.value)}
            className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
            title="Text Color"
          />
        </div>

        {/* Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-4 min-h-[150px] outline-none text-sm font-medium text-slate-700 dark:text-slate-200 auth-scroll-user"
          placeholder="Enter additional session details here..."
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
