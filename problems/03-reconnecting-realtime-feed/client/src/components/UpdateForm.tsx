import { useState, type FormEvent } from "react";
import { MESSAGE_MAX_LENGTH } from "../config.ts";
import type { ConnectionState } from "../types/connection.ts";

type UpdateFormProps = {
  connectionState: ConnectionState;
  onPublish: (message: string) => void;
};

export function UpdateForm({ connectionState, onPublish }: UpdateFormProps) {
  const [message, setMessage] = useState("");
  const disabled = connectionState !== "CONNECTED";

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed === "") {
      return;
    }
    onPublish(trimmed);
    setMessage("");
  }

  return (
    <form className="update-form" onSubmit={handleSubmit}>
      <label htmlFor="message">Message</label>
      <input
        id="message"
        name="message"
        type="text"
        value={message}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Database latency increased"
        disabled={disabled}
        autoComplete="off"
      />
      <button type="submit" disabled={disabled || message.trim() === ""}>
        Send Update
      </button>
    </form>
  );
}
