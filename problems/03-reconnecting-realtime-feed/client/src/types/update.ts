export const DEFAULT_INCIDENT_ID = "incident-123";

export type IncidentUpdate = {
  updateId: string;
  incidentId: string;
  message: string;
  createdAt: string;
  sequence: number;
};

export type RecoveryResponse = {
  updates: IncidentUpdate[];
  nextSequence: number;
};

export type PublishUpdatePayload = {
  incidentId: string;
  message: string;
};

export type PublishAck =
  | { ok: true; update: IncidentUpdate }
  | { ok: false; error: string };

export type JoinAck =
  | { ok: true }
  | { ok: false; error: string };

export interface ClientToServerEvents {
  join_incident: (
    payload: { incidentId: string },
    ack?: (response: JoinAck) => void
  ) => void;
  publish_update: (
    payload: PublishUpdatePayload,
    ack?: (response: PublishAck) => void
  ) => void;
}

export interface ServerToClientEvents {
  update_created: (update: IncidentUpdate) => void;
  feed_error: (payload: { message: string }) => void;
}
