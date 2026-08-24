type JsonLdValue = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdValue | JsonLdValue[] }) {
  const payload = Array.isArray(data) ? data : [data];
  // El JSON va dentro de un <script>, así que un "<" literal en cualquier valor
  // (los títulos y descripciones vienen de los boletines) podría cerrar la
  // etiqueta antes de tiempo y volcar el resto como HTML. Escaparlo a < es
  // JSON válido y el parser de Google lo lee igual.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
