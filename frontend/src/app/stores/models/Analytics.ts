import { getAnonUid, getAnonymousUsername } from "../../utils/auth";

type EventKind = "load" | "ping" | "outbound_click";


interface IEventData {
  username: string;
  userAgent: string;
  platform: string;

  // added by the server when saving
  ip?: string;
}

interface IPingEvent {
  // uid of the current hovered section
  section: string | null;
}

interface IOutboundClickEvent extends IEventData {
  url: string;
}

export class Event {
  userUid: string;
  kind: EventKind;
  data: IEventData | IPingEvent | IOutboundClickEvent;
  createdAt?: number;

  // Safer than switching on the type of args in the constructor.
  // The constructor is for instantiating objects from the server so we
  // create a static second constructor for the frontend to create new events
  static createEvent(kind: EventKind, data?: any): Event {
    const ev = new Event({});
    ev.userUid = getAnonUid();
    ev.kind = kind;

    const eventData = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      username: getAnonymousUsername(),
    };

    if (kind === "load") {
      ev.data = <IEventData> eventData;
    } else if (kind === "ping") {
      (<any> eventData).section = data.section;
      ev.data = eventData;
    } else if (kind === "outbound_click") {
      (<any> eventData).url = data.url;
      ev.data = eventData;
    }
    return ev;
  }

  constructor(data: any) {
    Object.assign(this, data);
  }
}


export interface IAnalytics {
  numberViews: number;
  lastSessionTimestamp: number;
  outboundClicks: Array<{url: string, count: number}>;
  averageSessionLength: number;
  sessions: Array<{
    start: number;
    end: number;
    length: number;
    data: IEventData | IPingEvent | IOutboundClickEvent;
  }>;
}

export class ProposalAnalytics {
  version: number;
  title: string;
  createdAt: number;
  commentsCount: number;
  analytics: IAnalytics;

  constructor(data: any) {
    this.version = data.version;
    this.title = data.title;
    this.createdAt = data.createdAt;
    this.commentsCount = data.commentsCount;
    this.analytics = data.analytics;
  }
}
