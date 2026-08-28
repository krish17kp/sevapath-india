export type QuestionLanguage = "en" | "hi" | "mr";

const MARATHI_SIGNALS = [
  "माझ", "मला", "आहे", "नाही", "करू", "कोणता", "किती", "पेन्शन", "बँक", "नाव", "मध्ये"
];
const HINDI_SIGNALS = [
  "मेरा", "मेरी", "मुझे", "है", "नहीं", "क्या", "कौन", "कितना", "पेंशन", "बैंक", "नाम", "में"
];

export function detectQuestionLanguage(value: string): QuestionLanguage {
  if (!/[\u0900-\u097f]/u.test(value)) return "en";
  const marathi = MARATHI_SIGNALS.filter((term) => value.includes(term)).length;
  const hindi = HINDI_SIGNALS.filter((term) => value.includes(term)).length;
  return marathi > hindi ? "mr" : "hi";
}
