const noop = () => {};

/** Copy plain text within a user gesture (click/touchend). Sync — required on iOS Safari. */
export function copyTextToClipboard(text: string): { ok: boolean, clear: () => void} {

  try {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      return { ok: true, clear: noop};
    }
  } catch (error) {
    // do nothing, continue
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    // clearing happens in callback
  }

  return { ok, clear: () => document.body.removeChild(textarea) };
}
