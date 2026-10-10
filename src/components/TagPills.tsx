import type { GarmentTags } from "../lib/types";
import { useI18n, type MessageKey } from "../lib/i18n";

// Etiquetas detectadas por la IA: tipo, color, temporada y formalidad.
export default function TagPills({ tags }: { tags: GarmentTags }) {
  const { t } = useI18n();
  return (
    <div className="tag-pills">
      <span className="tag-pill">{t(`kind.${tags.kind}` as MessageKey)}</span>
      <span className="tag-pill">
        <span className="swatch" style={{ background: tags.color_hex }} />
        {tags.color_name}
      </span>
      <span className="tag-pill">{t(`season.${tags.season}` as MessageKey)}</span>
      <span className="tag-pill">{t(`formality.${tags.formality}` as MessageKey)}</span>
    </div>
  );
}
