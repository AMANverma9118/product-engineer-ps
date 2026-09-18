type LogValue = string | number | boolean | null | undefined;
type LogFields = Record<string, LogValue>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(event: string, fields: LogFields = {}): void {
    write("info", event, fields);
  },
  warn(event: string, fields: LogFields = {}): void {
    write("warn", event, fields);
  },
  error(event: string, fields: LogFields = {}): void {
    write("error", event, fields);
  },
};
