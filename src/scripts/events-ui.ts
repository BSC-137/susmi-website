type View = "calendar" | "list";
type Filter = "all" | "talk" | "workshop" | "social" | "hack";

function readView(): View {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("view");
  if (fromQuery === "calendar" || fromQuery === "list") return fromQuery;
  const hash = window.location.hash.replace("#", "");
  if (hash === "calendar" || hash === "list") return hash;
  return "calendar";
}

function writeView(view: View) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  if (url.hash === "#calendar" || url.hash === "#list") url.hash = "";
  history.replaceState(null, "", url);
}

export function initEventsPage(root: HTMLElement) {
  const tablist = root.querySelector<HTMLElement>("[data-view-tabs]");
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-view-tab]")];
  const panels = {
    calendar: root.querySelector<HTMLElement>("#panel-calendar"),
    list: root.querySelector<HTMLElement>("#panel-list"),
  };
  const monthPanels = [...root.querySelectorAll<HTMLElement>("[data-month-panel]")];
  const monthLabel = root.querySelector<HTMLElement>("[data-month-label]");
  const prevBtn = root.querySelector<HTMLButtonElement>("[data-month-prev]");
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-month-next]");
  const dayButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-day]")];
  const detail = root.querySelector<HTMLElement>("[data-day-detail]");
  const detailTitle = root.querySelector<HTMLElement>("[data-detail-title]");
  const detailBody = root.querySelector<HTMLElement>("[data-detail-body]");
  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  const listItems = [...root.querySelectorAll<HTMLElement>("[data-list-item]")];

  if (!tablist || !panels.calendar || !panels.list || !detail || !detailTitle || !detailBody) {
    return;
  }

  let monthIndex = Math.max(
    0,
    monthPanels.findIndex((panel) => panel.dataset.monthPanel === root.dataset.initialMonth),
  );
  if (monthIndex < 0) monthIndex = 0;

  let selectedDate = root.dataset.initialSelected || "";
  let activeFilter: Filter = "all";

  const setView = (view: View, syncUrl = true) => {
    tabs.forEach((tab) => {
      const selected = tab.dataset.viewTab === view;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.calendar.hidden = view !== "calendar";
    panels.list.hidden = view !== "list";
    if (syncUrl) writeView(view);
  };

  const renderMonth = () => {
    monthPanels.forEach((panel, index) => {
      panel.hidden = index !== monthIndex;
    });
    const active = monthPanels[monthIndex];
    if (monthLabel && active) {
      monthLabel.textContent = active.dataset.monthLabel || "";
    }
    if (prevBtn) prevBtn.disabled = monthIndex <= 0;
    if (nextBtn) nextBtn.disabled = monthIndex >= monthPanels.length - 1;
  };

  const renderDetail = (iso: string) => {
    selectedDate = iso;
    dayButtons.forEach((btn) => {
      const on = btn.dataset.day === iso;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-selected", on);
    });

    const events = [...root.querySelectorAll<HTMLElement>(`[data-event-date="${iso}"]`)];
    const dayLabel =
      dayButtons.find((b) => b.dataset.day === iso)?.dataset.dayLabel || iso;

    detail.hidden = false;

    if (events.length === 0) {
      detailTitle.textContent = detail.dataset.emptyTitle || "Nothing scheduled";
      detailBody.innerHTML = `<p class="events-detail__empty">${detail.dataset.emptyCopy || "No events on this day."}</p>`;
      return;
    }

    detailTitle.textContent = `${detail.dataset.headingPrefix || "Events on"} ${dayLabel}`;
    detailBody.innerHTML = events
      .map((node) => `<article class="events-detail__item">${node.innerHTML}</article>`)
      .join("");
  };

  const applyFilter = (filter: Filter) => {
    activeFilter = filter;
    filterButtons.forEach((btn) => {
      const on = btn.dataset.filter === filter;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-active", on);
    });
    listItems.forEach((item) => {
      const type = item.dataset.eventType || "";
      const show = filter === "all" || type === filter;
      item.hidden = !show;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.viewTab as View;
      setView(view);
      tab.focus();
    });
  });

  tablist.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    let next = current;
    if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    const view = tabs[next].dataset.viewTab as View;
    setView(view);
    tabs[next].focus();
  });

  prevBtn?.addEventListener("click", () => {
    if (monthIndex <= 0) return;
    monthIndex -= 1;
    renderMonth();
  });

  nextBtn?.addEventListener("click", () => {
    if (monthIndex >= monthPanels.length - 1) return;
    monthIndex += 1;
    renderMonth();
  });

  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const iso = btn.dataset.day;
      if (!iso) return;
      const panel = btn.closest<HTMLElement>("[data-month-panel]");
      if (panel) {
        const idx = monthPanels.indexOf(panel);
        if (idx >= 0) {
          monthIndex = idx;
          renderMonth();
        }
      }
      renderDetail(iso);
    });
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyFilter((btn.dataset.filter as Filter) || "all");
    });
  });

  window.addEventListener("popstate", () => setView(readView(), false));

  setView(readView(), true);
  renderMonth();
  applyFilter("all");

  const initial =
    selectedDate ||
    dayButtons.find((btn) => btn.dataset.hasEvents === "true")?.dataset.day ||
    "";
  if (initial) renderDetail(initial);
  else {
    detail.hidden = false;
    detailTitle.textContent = "Select a day";
    detailBody.innerHTML = `<p class="events-detail__empty">Choose a highlighted day to see what is on.</p>`;
  }
}
