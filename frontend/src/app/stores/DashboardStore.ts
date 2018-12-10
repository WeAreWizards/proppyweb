import { observable, action } from "mobx";

import { Template } from "./models/Template";
import router from "../routes";
import { SearchTermType } from "../interfaces";
import { parseSearchString, stringifySearch, Query } from "../utils/search";
import {Store} from "./RootStore";
import fetchling from "../utils/fetchling";


export class DashboardStore extends Store {
  @observable templates: Array<Template> = [];
  @observable query: Query = new Query();

  @action clearQuery() {
    this.query = new Query();
  }

  @action fetchData(): Promise<any> {
    return fetchling("/dashboard").get().then(action((response: any) => {
      this.rootStore.userStore.setUsers(response.users);
      this.rootStore.clientStore.setClients(response.clients);
      this.rootStore.proposalStore.setProposals(response.proposals);
      this.templates = response.templates.map(t => new Template(t));
      this.rootStore.blockStore.clear();
    }));
  }

  @action duplicateTemplate(uid: string) {
    fetchling(`/templates/${uid}/duplicate`).post({})
      .then((response: any) => {
        router.navigate("editor", {id: response.proposal.id});
      });
  }

  @action appendOrReplaceQuery(type: SearchTermType, term: string) {
    // clear search for that term type is value is empty
    if (term === "") {
      this.query.terms = this.query.terms.filter(x => x.type !== type);
      this.query.input = stringifySearch(this.query);
      return;
    }

    if (this.query.terms.some(x => x.type === type)) {
      this.query.terms = this.query.terms.map(x => x.type === type ? {type, term} : x);
    } else {
      this.query.terms.push({type, term});
    }
    this.query.input = stringifySearch(this.query);
  }

  setQueryStatus(status: string) {
    this.appendOrReplaceQuery(SearchTermType.STATUS, status);
  }

  setQueryTag(tag: string) {
    this.appendOrReplaceQuery(SearchTermType.TAG, tag);
  }

  setQueryClient(client: string) {
    this.appendOrReplaceQuery(SearchTermType.CLIENT, client);
  }

  @action setSearch(q: string) {
    this.query = parseSearchString(q);
  }

  get currentStatusTerm() {
    // TODO: We should have a better way to communicate the "all" search.
    const status = this.query.terms.find(x => x.type === SearchTermType.STATUS);
    if (status) {
      return status.term;
    }
    return "";
  }

  isOnTemplatePage() {
    return this.query.terms.some(v => v.type === SearchTermType.STATUS && v.term === "template");
  }
}
