// Lightweight JSON syntax highlighter — returns HTML string with span classes.
export function highlightJson(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "j-num";
      if (/^"/.test(match)) {
        cls = /:\s*$/.test(match) ? "j-key" : "j-str";
      } else if (match === "true" || match === "false") {
        cls = "j-bool";
      } else if (match === "null") {
        cls = "j-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function isJsonContentType(ct: string): boolean {
  return /application\/(json|.*\+json)|text\/json/i.test(ct);
}
