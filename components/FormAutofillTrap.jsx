/** Ukryte pola — przeglądarka często wypełnia je zamiast prawdziwych pól formularza pokoju. */
export default function FormAutofillTrap() {
  return (
    <div className="form-autofill-trap" aria-hidden="true">
      <input type="text" name="fake_user" tabIndex={-1} autoComplete="username" readOnly defaultValue="" />
      <input type="password" name="fake_pass" tabIndex={-1} autoComplete="current-password" readOnly defaultValue="" />
    </div>
  );
}
