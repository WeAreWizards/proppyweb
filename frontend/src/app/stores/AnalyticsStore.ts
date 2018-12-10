import { observable, action } from "mobx";

import { ProposalAnalytics } from "./models/Analytics";
import { Proposal } from "./models/Proposal";
import fetchling from "../utils/fetchling";

import {Store} from "./RootStore";

export class AnalyticsStore extends Store {
  @observable proposal: Proposal | null = null;
  @observable data: Array<ProposalAnalytics> = [];

  @action fetchData(proposalId: string | number): Promise<any> {
    return fetchling(`/analytics/${proposalId}`).get()
      .then((response: any) => {
        this.rootStore.userStore.setUser(response.me);
        this.rootStore.userStore.setMe();
        this.proposal = new Proposal(response.proposal);
        this.data = response.data.map(a => new ProposalAnalytics(a));
      });
  }

  @action clear() {
    this.proposal = null;
    this.data = [];
  }
}
