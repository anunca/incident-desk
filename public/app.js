const el = (id) => document.getElementById(id);
let role = "reader",
  offset = 0;
const statusLabels = {
  open: "Ouvert",
  investigating: "En investigation",
  resolved: "Résolu",
};
function message(text) {
  el("message").textContent = text;
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "incident-desk",
      ...options.headers,
    },
  });
  if (response.status === 204) return;
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  return response.json();
}
function node(tag, text) {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
}
async function load(append = false) {
  try {
    if (!append) {
      offset = 0;
      el("incidents").replaceChildren();
    }
    const { items } = await api(`/api/incidents?limit=20&offset=${offset}`);
    el("login").hidden = true;
    el("workspace").hidden = false;
    el("logout").hidden = false;
    for (const item of items) {
      const card = node("article", "");
      card.append(
        node("h3", item.title),
        node("p", item.description),
        node(
          "p",
          `${statusLabels[item.status]} · ${item.severity} · version ${item.version}`,
        ),
      );
      if (role !== "reader") {
        const actions = node("div", "");
        actions.className = "actions";
        const next = {
          open: ["investigating", "resolved"],
          investigating: ["open", "resolved"],
          resolved: ["open"],
        }[item.status];
        for (const status of next) {
          const button = node("button", statusLabels[status]);
          button.onclick = async () => {
            button.disabled = true;
            try {
              await api(`/api/incidents/${item.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status, version: item.version }),
              });
              message("Statut modifié.");
              await load();
            } catch (error) {
              message(error.message);
              button.disabled = false;
            }
          };
          actions.append(button);
        }
        card.append(actions);
      }
      const details = node("details", "");
      details.append(node("summary", "Historique"));
      details.addEventListener("toggle", async () => {
        if (!details.open || details.dataset.loaded) return;
        try {
          const history = await api(`/api/incidents/${item.id}/events`);
          const list = node("ul", "");
          for (const event of history.items)
            list.append(
              node(
                "li",
                `${new Date(event.at).toLocaleString("fr-FR")} — ${event.action} → ${statusLabels[event.toStatus]}`,
              ),
            );
          details.append(list);
          details.dataset.loaded = "yes";
        } catch (error) {
          message(error.message);
        }
      });
      card.append(details);
      el("incidents").append(card);
    }
    offset += items.length;
    el("more").hidden = items.length < 20;
    if (!offset) el("incidents").append(node("p", "Aucun incident."));
  } catch (error) {
    message(error.message);
  }
}
el("login").onsubmit = async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  try {
    const session = await api("/api/session", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(data)),
    });
    role = session.role;
    el("create").hidden = role === "reader";
    event.target.reset();
    message("Connexion réussie.");
    await load();
  } catch (error) {
    message(error.message);
  }
};
el("create").onsubmit = async (event) => {
  event.preventDefault();
  try {
    await api("/api/incidents", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(event.target))),
    });
    event.target.reset();
    message("Incident créé.");
    await load();
  } catch (error) {
    message(error.message);
  }
};
el("logout").onclick = async () => {
  try {
    await api("/api/session", { method: "DELETE" });
    location.reload();
  } catch (error) {
    message(error.message);
  }
};
el("refresh").onclick = () => load();
el("more").onclick = () => load(true);
// No bearer token is persisted in browser storage. Login again after reload.
