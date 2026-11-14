export function escapeAction(input: {
  key: string;
  defaultPrevented: boolean;
  isComposing: boolean;
  popupOpen: boolean;
  composerOpen: boolean;
  noticeVisible: boolean;
}): "ignore" | "dismiss-notice" | "fold" {
  if (input.key !== "Escape" || input.defaultPrevented || input.isComposing || input.popupOpen)
    return "ignore";
  if (input.noticeVisible) return "dismiss-notice";
  return input.composerOpen ? "ignore" : "fold";
}
