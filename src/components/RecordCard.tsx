import type { ExtractedRecord } from "@/lib/domain/types";

/**
 * Shows one synthetic record's extracted fields.
 *
 * A field SevaPath could not read is shown as "not readable" rather than being
 * left blank, so an absent value is never mistaken for an empty one.
 */
export function RecordCard({ record }: { record: ExtractedRecord }) {
  return (
    <div className="record">
      <span className="synthetic-tag">Synthetic</span>
      <h3>{record.title}</h3>
      <p className="muted">
        Read by {record.engine === "model" ? "the language model" : "the built-in reader"}
      </p>
      <dl className="field-list">
        {record.fields.map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            {field.value === null ? (
              <dd className="absent">not readable</dd>
            ) : (
              <dd>{field.value}</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
