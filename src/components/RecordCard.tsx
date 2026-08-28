import type { ExtractedRecord, RecordKind } from "@/lib/domain/types";
import { IconBank, IconCertificate, IconDocument } from "./Icons";

/**
 * Shows one synthetic record as a small document rather than a data card.
 *
 * A field SevaPath could not read is shown as "not readable" rather than being
 * left blank, so an absent value is never mistaken for an empty one. The fields
 * the deterministic checks compare across records are highlighted, so a citizen
 * can see what was actually looked at without reading every line.
 */

const ICON_BY_KIND = {
  ppo: IconDocument,
  death_certificate: IconCertificate,
  bank_proof: IconBank
} as const;

/** The fields the cross-document checks read. Highlighted in the preview. */
const COMPARED_FIELDS: Record<RecordKind, string[]> = {
  ppo: ["ppo_number", "pensioner_name", "spouse_name"],
  death_certificate: ["deceased_name", "date_of_death", "informant_name"],
  bank_proof: ["account_holder_name", "account_number"]
};

export function RecordCard({ record }: { record: ExtractedRecord }) {
  const Glyph = ICON_BY_KIND[record.kind];
  const compared = COMPARED_FIELDS[record.kind];

  return (
    <div className="record">
      <div className="record-head">
        <span className="doc-icon" aria-hidden="true">
          <Glyph size={19} />
        </span>
        <span style={{ minWidth: 0 }}>
          <h3>{record.title}</h3>
          <span className="synthetic-tag">Synthetic</span>
        </span>
      </div>

      <div className="record-body">
        <dl className="field-list">
          {record.fields.map((field) => (
            <div
              key={field.key}
              className={compared.includes(field.key) ? "is-key" : undefined}
            >
              <dt>{field.label}</dt>
              {field.value === null ? (
                <dd className="absent">not readable</dd>
              ) : (
                <dd>{field.value}</dd>
              )}
            </div>
          ))}
        </dl>
        <p className="record-engine">
          Read by{" "}
          {record.engine === "model"
            ? "the language model"
            : "the built-in reader"}
        </p>
      </div>
    </div>
  );
}
