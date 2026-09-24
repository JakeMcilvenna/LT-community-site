"use client";

import FullCalendar, { type CalendarRef, type EventClickInfo, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import listPlugin from "@fullcalendar/react/list";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, MapPin, Repeat2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { GuildEvent } from "@/types/guild";

const eventKey = (event: GuildEvent) => `${event.id}-${event.startAt}`;
const isEventExpired = (event: Pick<GuildEvent, "endAt">, now = Date.now()) => {
  const endTime = new Date(event.endAt).getTime();
  return Number.isFinite(endTime) && endTime <= now;
};

const eventClassNames = (event: GuildEvent, expired: boolean) => {
  const typeClass = event.type === "Progression"
    ? "raid-calendar-event--progression"
    : event.type === "Optional Raid"
      ? "raid-calendar-event--optional"
      : "raid-calendar-event--guild";
  return [
    "raid-calendar-event",
    typeClass,
    ...(event.team === "forever" ? ["raid-calendar-event--forever"] : []),
    ...(expired ? ["raid-calendar-event--expired"] : []),
  ];
};

export function RaidCalendar({ events, timeZone }: { events: GuildEvent[]; timeZone: string }) {
  const calendarRef = useRef<CalendarRef>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [calendarTitle, setCalendarTitle] = useState(() => new Intl.DateTimeFormat("en-GB", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(new Date()));
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const calendarEvents = useMemo<EventInput[]>(() => events.map((event) => {
    const expired = isEventExpired(event, now);
    const isForeverTeam = event.team === "forever";
    return {
      id: eventKey(event),
      title: event.title,
      start: event.startAt,
      end: event.endAt,
      classNames: eventClassNames(event, expired),
      backgroundColor: isForeverTeam ? "rgba(121, 201, 194, 0.18)" : undefined,
      borderColor: isForeverTeam ? "rgba(142, 224, 214, 0.58)" : undefined,
      extendedProps: { expired, isForeverTeam },
    };
  }), [events, now]);

  const selectedEvent = events.find((event) => eventKey(event) === selectedEventKey);
  const selectedEventExpired = selectedEvent ? isEventExpired(selectedEvent, now) : false;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateView = () => {
      const compact = mediaQuery.matches;
      const api = calendarRef.current?.getApi();
      if (api && api.view.type !== (compact ? "listMonth" : "dayGridMonth")) {
        api.changeView(compact ? "listMonth" : "dayGridMonth");
      }
    };

    updateView();
    mediaQuery.addEventListener("change", updateView);
    return () => mediaQuery.removeEventListener("change", updateView);
  }, []);

  useEffect(() => {
    if (selectedEvent && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selectedEvent]);

  const formatDate = (iso: string) => new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

  const formatTime = (iso: string) => new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

  const handleEventClick = (info: EventClickInfo) => {
    info.jsEvent.preventDefault();
    setSelectedEventKey(info.event.id);
  };

  const closeDialog = () => dialogRef.current?.close();
  const calendarApi = () => calendarRef.current?.getApi();

  return (
    <div className="raid-calendar surface mt-6 overflow-hidden" data-color-scheme="dark">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-[rgba(223,193,132,0.24)] bg-[rgba(198,166,108,0.08)] text-[var(--accent-strong)]">
            <CalendarDays aria-hidden="true" size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="display-font text-xl sm:text-2xl">Raid calendar</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">
              <span className="sm:hidden">Select a raid to see its details.</span>
              <span className="hidden sm:inline">Choose Month or List, then select a raid to see its details.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <nav className="raid-calendar-toolbar" aria-label="Calendar controls">
          <div className="raid-calendar-toolbar-actions">
            <button type="button" className="raid-calendar-control raid-calendar-control--icon" onClick={() => calendarApi()?.prev()} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.9} />
            </button>
            <button type="button" className="raid-calendar-control raid-calendar-control--icon" onClick={() => calendarApi()?.next()} aria-label="Next month">
              <ChevronRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </button>
            <button type="button" className="raid-calendar-control" onClick={() => calendarApi()?.today()}>Today</button>
          </div>

          <h3 className="raid-calendar-toolbar-title" aria-live="polite">{calendarTitle}</h3>

          <div className="raid-calendar-toolbar-actions raid-calendar-view-switch" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={`raid-calendar-control ${currentView === "dayGridMonth" ? "is-active" : ""}`}
              aria-pressed={currentView === "dayGridMonth"}
              onClick={() => calendarApi()?.changeView("dayGridMonth")}
            >
              Month
            </button>
            <button
              type="button"
              className={`raid-calendar-control ${currentView === "listMonth" ? "is-active" : ""}`}
              aria-pressed={currentView === "listMonth"}
              onClick={() => calendarApi()?.changeView("listMonth")}
            >
              List
            </button>
          </div>
        </nav>

        <FullCalendar
          ref={calendarRef}
          plugins={[classicThemePlugin, dayGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDisplay="block"
          eventContent={(info) => (
            <div className={`raid-calendar-event-content${info.event.extendedProps.expired ? " is-expired" : " is-upcoming"}${info.event.extendedProps.isForeverTeam ? " is-forever" : ""}${info.view.type === "listMonth" ? " is-list" : ""}`}>
              <span className="raid-calendar-event-indicator" aria-hidden="true" />
              <div className="raid-calendar-event-details">
                <span className="raid-calendar-event-time">{info.timeText}</span>
                {info.event.extendedProps.expired ? <span className="raid-calendar-event-status">Expired</span> : null}
                <span className="raid-calendar-event-title">{info.event.title}</span>
              </div>
            </div>
          )}
          eventDidMount={(info) => {
            info.el.style.setProperty("cursor", "pointer", "important");
            info.el.querySelectorAll<HTMLElement>("*").forEach((element) => {
              element.style.setProperty("cursor", "pointer", "important");
            });
            if (info.view.type === "listMonth") {
              const nativeIndicator = Array.from(info.el.children)
                .find((child) => !child.querySelector(".raid-calendar-event-content"));
              (nativeIndicator as HTMLElement | undefined)?.style.setProperty("display", "none", "important");
            }
            if (info.event.extendedProps.expired) {
              const expiredBackground = info.view.type === "dayGridMonth"
                ? "rgba(128, 132, 128, 0.22)"
                : "transparent";
              info.el.style.setProperty("background-color", expiredBackground, "important");
              info.el.style.setProperty("border-color", "transparent", "important");
              info.el.style.setProperty("color", "#b7b4ac", "important");
              info.el.style.setProperty("opacity", "0.85", "important");
              info.el.querySelectorAll<HTMLElement>("*").forEach((element) => {
                element.style.setProperty("color", "#b7b4ac", "important");
              });
            }
          }}
          datesSet={(info) => {
            setCalendarTitle(info.view.title);
            setCurrentView(info.view.type);
          }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }}
          firstDay={1}
          fixedWeekCount={false}
          showNonCurrentDates
          dayMaxEvents={3}
          displayEventEnd={false}
          height="auto"
          locale="en-gb"
          timeZone={timeZone}
          noEventsContent="No raids scheduled for this month."
        />
      </div>

      {selectedEvent ? (
        <dialog
          ref={dialogRef}
          className="raid-event-dialog"
          aria-labelledby="raid-event-dialog-title"
          aria-describedby="raid-event-dialog-description"
          onClose={() => setSelectedEventKey(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <article className="raid-event-dialog-panel">
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Raid details</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 id="raid-event-dialog-title" className="display-font text-2xl sm:text-3xl">{selectedEvent.title}</h3>
                  <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-[#b7b4ac]">{selectedEvent.type}</span>
                  {selectedEventExpired ? <span className="raid-event-expired-badge">Expired</span> : null}
                </div>
              </div>
              <button autoFocus type="button" className="raid-event-dialog-close" onClick={closeDialog} aria-label="Close raid details">
                <X aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </header>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-sm font-semibold text-[var(--accent-strong)]">{formatDate(selectedEvent.startAt)}</p>
              <p id="raid-event-dialog-description" className="mt-3 text-sm leading-6 text-[var(--muted)]">{selectedEvent.description}</p>
              {selectedEventExpired ? <p className="mt-3 text-sm font-semibold text-[#b7b4ac]">This event has ended. Sign-up is closed.</p> : null}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#9a9993]">
                <span className="flex items-center gap-1.5"><Clock3 aria-hidden="true" size={14} /> {formatTime(selectedEvent.startAt)}–{formatTime(selectedEvent.endAt)}</span>
                {selectedEvent.location ? <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} /> {selectedEvent.location}</span> : null}
                {selectedEvent.recurringLabel ? <span className="flex items-center gap-1.5"><Repeat2 aria-hidden="true" size={14} /> {selectedEvent.recurringLabel}</span> : null}
                {selectedEvent.status ? <span className="flex items-center gap-1.5"><CheckCircle2 aria-hidden="true" size={14} /> {selectedEvent.status}</span> : null}
                {selectedEvent.signupLabel ? <span className="flex items-center gap-1.5"><UsersRound aria-hidden="true" size={14} /> {selectedEvent.signupLabel}</span> : null}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" className="button-secondary" onClick={closeDialog}>Close</button>
                {selectedEvent.signupUrl && !selectedEventExpired ? (
                  <a className="button-primary" href={selectedEvent.signupUrl} target="_blank" rel="noreferrer">
                    Sign up <ExternalLink aria-hidden="true" size={15} />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        </dialog>
      ) : null}
    </div>
  );
}
