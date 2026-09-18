import { ConnectionStatus } from "./components/ConnectionStatus.tsx";
import { DevControls } from "./components/DevControls.tsx";
import { FeedList } from "./components/FeedList.tsx";
import { UpdateForm } from "./components/UpdateForm.tsx";
import { useIncidentFeed } from "./hooks/useIncidentFeed.ts";
import { DEFAULT_INCIDENT_ID } from "./types/update.ts";
import "./App.css";

function App() {
  const {
    connectionState,
    updates,
    error,
    publishUpdate,
    simulateDisconnect,
    reconnect,
  } = useIncidentFeed(DEFAULT_INCIDENT_ID);

  return (
    <main className="page">
      <h1>Incident Real-Time Feed</h1>
      <ConnectionStatus state={connectionState} />
      <p>
        Incident: <code>{DEFAULT_INCIDENT_ID}</code>
      </p>
      <p className="hint">
        Open this page in two browser windows to demonstrate the shared feed.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <UpdateForm
        connectionState={connectionState}
        onPublish={publishUpdate}
      />
      <DevControls
        connectionState={connectionState}
        onSimulateDisconnect={simulateDisconnect}
        onReconnect={reconnect}
      />
      <h2>Feed</h2>
      <FeedList updates={updates} />
    </main>
  );
}

export default App;
