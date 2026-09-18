import type { ConnectionState } from "../types/connection.ts";

type DevControlsProps = {
  connectionState: ConnectionState;
  onSimulateDisconnect: () => void;
  onReconnect: () => void;
};

export function DevControls({
  connectionState,
  onSimulateDisconnect,
  onReconnect,
}: DevControlsProps) {
  return (
    <section className="dev-controls">
      <p className="dev-label">Demo controls</p>
      <button
        type="button"
        onClick={onSimulateDisconnect}
        disabled={connectionState === "DISCONNECTED"}
      >
        Simulate Disconnect
      </button>
      <button
        type="button"
        onClick={onReconnect}
        disabled={connectionState === "CONNECTED"}
      >
        Reconnect
      </button>
    </section>
  );
}
