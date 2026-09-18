import type { ConnectionState } from "../types/connection.ts";

const STATUS: Record<
  ConnectionState,
  { src: string; label: string }
> = {
  CONNECTED: { src: "/status-green.svg", label: "Connected" },
  RECONNECTING: { src: "/status-yellow.svg", label: "Reconnecting..." },
  DISCONNECTED: { src: "/status-red.svg", label: "Disconnected" },
};

type ConnectionStatusProps = {
  state: ConnectionState;
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const status = STATUS[state];

  return (
    <p className={`status status-${state.toLowerCase()}`} role="status">
      <img
        className="status-dot"
        src={status.src}
        alt=""
        width={14}
        height={14}
      />
      {status.label}
    </p>
  );
}
