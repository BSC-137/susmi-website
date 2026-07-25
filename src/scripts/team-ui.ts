export function initTeamPage(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLButtonElement>("[data-roster-item]")];
  const dossiers = [...root.querySelectorAll<HTMLElement>("[data-dossier]")];
  if (!items.length || !dossiers.length) return;

  const readMember = () => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("member");
    if (fromQuery && items.some((item) => item.dataset.rosterItem === fromQuery)) {
      return fromQuery;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && items.some((item) => item.dataset.rosterItem === hash)) return hash;
    return root.dataset.initialMember || items[0].dataset.rosterItem || "";
  };

  const writeMember = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("member", id);
    if (url.hash.replace(/^#/, "") === id) url.hash = "";
    history.replaceState(null, "", url);
  };

  const select = (id: string, syncUrl = true, focusItem = false) => {
    items.forEach((item) => {
      const on = item.dataset.rosterItem === id;
      item.classList.toggle("is-active", on);
      item.setAttribute("aria-selected", String(on));
      item.tabIndex = on ? 0 : -1;
      if (on && focusItem) item.focus();
    });

    dossiers.forEach((panel) => {
      const on = panel.dataset.dossier === id;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });

    if (syncUrl) writeMember(id);
  };

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.dataset.rosterItem;
      if (!id) return;
      select(id, true, false);
    });
  });

  const list = root.querySelector("[data-roster-list]");
  list?.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = items.findIndex((item) => item.getAttribute("aria-selected") === "true");
    let next = current;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = (current + 1) % items.length;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = (current - 1 + items.length) % items.length;
    }
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    const id = items[next]?.dataset.rosterItem;
    if (id) select(id, true, true);
  });

  window.addEventListener("popstate", () => select(readMember(), false));
  select(readMember(), true);
}
