export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "t3-companion:draft:v1:";

export function createDraftStore(storage: DraftStorage | null) {
  const memory = new Map<string, string>();
  const read = (key: string) => {
    if (memory.has(key)) return memory.get(key)!;
    try {
      return storage?.getItem(PREFIX + key) ?? "";
    } catch {
      return "";
    }
  };
  const write = (key: string, value: string) => {
    memory.set(key, value);
    if (!storage) return false;
    try {
      if (value.length === 0) storage.removeItem(PREFIX + key);
      else storage.setItem(PREFIX + key, value);
      return true;
    } catch {
      return false;
    }
  };
  return {
    read,
    write,
    complete(key: string, submitted: string) {
      if (read(key) !== submitted) return false;
      write(key, "");
      return true;
    },
  };
}
