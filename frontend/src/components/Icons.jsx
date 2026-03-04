const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const IconPlus   = () => <Icon d="M12 5v14M5 12h14" />;
export const IconTrash  = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />;
export const IconImage  = () => <Icon d="M21 15l-5-5L5 20M3 3h18v18H3zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />;
export const IconVideo  = () => <Icon d="M15 10l4.553-2.276A1 1 0 0121 8.724v6.552a1 1 0 01-1.447.894L15 14M3 8h12v8H3z" />;
export const IconCrop   = () => <Icon d="M6 2v14h14M2 6h14v14" />;
export const IconText   = () => <Icon d="M4 7V4h16v3M9 20h6M12 4v16" />;
export const IconEmoji  = () => <Icon d="M12 2a10 10 0 100 20A10 10 0 0012 2zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />;
export const IconFrame  = () => <Icon d="M3 3h18v18H3zM7 7h10v10H7z" />;
export const IconLayers = () => <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
export const IconUpload = () => <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
export const IconClose  = () => <Icon d="M18 6L6 18M6 6l12 12" />;
export const IconArrowL = () => <Icon d="M19 12H5M12 5l-7 7 7 7" />;
export const IconEdit   = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;