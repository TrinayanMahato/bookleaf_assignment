// Shows the first backend (Zod) validation message for a field.
export default function FieldError({ details, name }) {
  const message = details?.[name]?.[0];
  return message ? <p className="field-error">{message}</p> : null;
}
