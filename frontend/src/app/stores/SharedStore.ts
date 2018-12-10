import { action } from "mobx";

import { SharedProposal } from "./models/SharedProposal";
import { Event } from "./models/Analytics";
import fetchling from "../utils/fetchling";
import { isLoggedIn } from "../utils/auth";
import {Store} from "./RootStore";


export class SharedStore extends Store {
  proposal: SharedProposal | null = null;
  version: number | undefined;
  uid: string | null;
  isLatest: boolean;

  @action setSharedProposal(shareUid: string, data: any) {
    this.proposal = new SharedProposal(data.shared);
    this.rootStore.blockStore.setBlocks(data.blocks);
    this.uid = shareUid;
    this.isLatest = data.isLatest;
    this.rootStore.companyStore.setUs(data.company);
    this.rootStore.commentStore.loadSharedComments(data.threads);
    this.rootStore.userStore.setUsers(data.users);
  }

  @action fetchOne(shareUid: string, version?: number): Promise<any> {
    // The cache buster shouldn't be needed but it happened that a user saw the
    // previous version on share
    this.version = version;
    const versionPath = version === undefined ? "" : `/${version}`;
    return fetchling(`/shared/${shareUid}${versionPath}?${Date.now()}`).get()
      .then((response: any) => {
        this.setSharedProposal(shareUid, response);
      })
      .catch(() => {
        // reset on fail to avoid showing a previous shared proposal
        // (e.g. when hitting the back button)
        this.clear();
      });
  }

  @action clear() {
    this.proposal = null;
    this.uid = null;
    this.isLatest = true;
    this.rootStore.blockStore.clear();
  }

  @action sign(name: string, signature: string): Promise<any> {
    return fetchling(`/shared/${this.uid}/sign`)
      .post({name, signature, userAgent: navigator.userAgent})
      .then((response: any) =>  {
        // TODO: add notification on shared proposal as well?
        // uiStore.notify("Proposal signed", false);
        this.setSharedProposal(this.uid, response);
      })
      .catch(() => this.rootStore.uiStore.notify("Errored while saving signature.", true));
  }

  @action payWithStripe(token: string, amount: number, currency: string): Promise<any> {
    return fetchling(`/shared/${this.uid}/stripe_payment`)
      .post({token, amount, currency})
      .then((response: any) =>  {
        // TODO: add notification on shared proposal as well?
        // uiStore.notify("Proposal signed", false);
        this.setSharedProposal(this.uid, response);
      })
      .catch(() => this.rootStore.uiStore.notify("Errored while paying with Stripe", true));
  }

  getAnalyticsUrl(): string {
    if (this.version) {
      return `/analytics/${this.uid}/${this.version}`;
    }

    return `/analytics/${this.uid}`;
  }

  sendLoadEvent() {
    if (isLoggedIn()) {
      return;
    }
    const event = Event.createEvent("load");
    fetchling(this.getAnalyticsUrl()).post({event});
  }

  sendPingEvent(section: string | null) {
    if (isLoggedIn()) {
      return;
    }
    const event = Event.createEvent("ping", {section});
    fetchling(this.getAnalyticsUrl()).post({event});
  }

  sendOutboundClickEvent(url: string) {
    if (isLoggedIn()) {
      return;
    }
    const event = Event.createEvent("outbound_click", {url});
    fetchling(this.getAnalyticsUrl()).post({event});
  }
}
