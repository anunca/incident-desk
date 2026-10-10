CREATE TABLE users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL CHECK (email = lower(email)),
 password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('reader','operator','admin'))
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE incidents (
 id uuid PRIMARY KEY, title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
 description text NOT NULL CHECK (length(description) <= 4000),
 severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
 status text NOT NULL CHECK (status IN ('open','investigating','resolved')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidents_order ON incidents(created_at DESC, id DESC);
CREATE TABLE incident_events (
 id uuid PRIMARY KEY, incident_id uuid NOT NULL REFERENCES incidents(id),
 actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL,
 from_status text, to_status text NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_events_history ON incident_events(incident_id, at, id);
