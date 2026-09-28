const CALL_LABEL: Record<string, string> = {
  open: "Open File",
  read: "Read File",
  pread: "Read File",
  write: "Write File",
  pwrite: "Write File",
  writev: "Write File",
  fsync: "Write File",
  close: "Close",
  unlink: "Delete File",
  rename: "Rename File",
  getdents: "List Files",
  stat: "Check File",
  mkdir: "Make Folder",
  execve: "Run Program",
};

export function callLabel(call: string): string {
  return CALL_LABEL[call] ?? call;
}

export function sequenceText(calls: string[]): string {
  return calls.map(callLabel).join(" → ");
}
