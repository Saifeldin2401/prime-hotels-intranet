export interface DocumentTag {
  id: string;
  name: string;
  color: string;
  documentCount?: number;
}

interface DocumentTagManagerProps {
  tags: DocumentTag[];
  selectedTags?: string[];
  onSelectTags?: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: string) => void;
  onDeleteTag?: (tagId: string) => void;
  onAssignTags?: (documentIds: string[], tagIds: string[]) => void;
  documents?: { id: string; title: string }[];
  selectedDocumentIds?: string[];
  mode?: "manage" | "assign" | "filter";
  className?: string;
}

const TAG_COLORS = [
  { name: "Red", value: "#ef4444", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { name: "Yellow", value: "#eab308", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  { name: "Lime", value: "#84cc16", bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
  { name: "Green", value: "#22c55e", bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { name: "Teal", value: "#14b8a6", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { name: "Sky", value: "#0ea5e9", bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { name: "Indigo", value: "#6366f1", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { name: "Fuchsia", value: "#d946ef", bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { name: "Slate", value: "#64748b", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  { name: "Zinc", value: "#71717a", bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200" },
];

function getColorClasses(colorValue: string) {
  const color = TAG_COLORS.find((c) => c.value === colorValue);
  return color || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
}
