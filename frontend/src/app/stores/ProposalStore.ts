import { observable, action, ObservableMap } from "mobx";
import { debounce } from "lodash";

import fetchling from "../utils/fetchling";
import { mergeBlocks } from "../utils/merge";
import { DISPLAY_NAME } from "../constants/status";
import { Proposal } from "./models/Proposal";
import { Block } from "./models/Block";
import router from "../routes";
import {Store} from "./RootStore";


export class ProposalStore extends Store {
  @observable proposals: ObservableMap<Proposal> = new ObservableMap<Proposal>();
  @observable current: Proposal | null = null;
  @observable allTags: Array<string> = [];

  // we debounce call to save to avoid saving while typing which might be weird
  // and remove some CE potential issues like with the H1 where it might get one
  // character behind at some point due to various issues
  debouncedSave = debounce(() => {
    this.performSave();
  }, 3000);


  @action setProposal(data: any) {
    const p = new Proposal(data);
    this.proposals.set(p.id.toString(), p);
  }

  @action setProposals(data: Array<any>) {
    this.proposals.clear();
    data.map(p => this.setProposal(p));
  }

  @action clearCurrent() {
    this.debouncedSave.flush();
    this.current = null;
    this.rootStore.blockStore.clear();
  }

  @action create() {
    fetchling("/proposals").post()
      .then((response: any) => router.navigate("editor", {id: response.proposal.id}));
  }

  // Called when we fetch/save the proposal in the editor
  @action setFromSingleProposal(data: any, blocksForMerge = null) {
    this.debouncedSave.cancel();
    this.current = new Proposal(data.proposal);
    this.rootStore.blockStore.setBlocks(data.blocks, blocksForMerge);
    this.rootStore.clientStore.setClients(data.clients);
    this.rootStore.userStore.setUsers(data.users);
    this.rootStore.companyStore.setUs(data.company);
    this.allTags = data.tags;
  }

  @action fetchOne(id: number): Promise<any> {
    return fetchling(`/proposals/${id}`).get()
      .then((response: any) => this.setFromSingleProposal(response));
  }

  @action updateStatus(id: number, status: string) {
    fetchling(`/proposals/${id}/status`).put({status})
      .then((response: any) => {
        this.setProposal(response.proposal);
        const message = status === "trash"
          ? `${response.proposal.title} has been moved to the trash`
          : `${response.proposal.title} set to ${DISPLAY_NAME[status]}`;
        this.rootStore.uiStore.notify(message, false);
    });
  }

  @action delete(id: number) {
    fetchling(`/proposals/${id}`).delete().then(() => this.proposals.delete(id.toString()));
  }

  @action duplicate(id: number) {
    fetchling(`/proposals/${id}/duplicate`).post({})
      .then((response: any) => router.navigate("editor", {id: response.proposal.id}));
  }

  // Actually save the proposal from the editor
  @action performSave(force = false) {
    // Don't bother with regular updates from proposal if we have an error
    if (!force && this.rootStore.editorStore.hasSaveError) {
      return;
    }
    if (!force && this.rootStore.editorStore.isSaving) {
      return;
    }

    this.rootStore.editorStore.startSaving();

    const p: any = Object.assign({}, this.current);
    // If the client is of type number it means we already have them on
    // our server (and the number is the DB id).
    // TODO: create client sync instead
    if (typeof p.clientId !== "number" && p.clientId !== null) {
      p.clientName = p.clientId;
      delete p.clientId;
    }

    fetchling(`/proposals/${p.id}`).get()
      .then((payload: any) => {
        // blocks from server
        const serverBlocks = payload.blocks.map(block => new Block(block));
        // three-way merge against the latest version of blocks
        p.blocks = mergeBlocks(this.rootStore.blockStore.blocksForMerge, this.rootStore.blockStore.blocks, serverBlocks);

        fetchling(`/proposals/${p.id}`).put(p).then((response: any) => {
          // put introduces another delay so we need to merge again
          // after it has finished. Otherwise local changes between the
          // merge after GET and the PUT finishing will be lost.
          payload.blocks = mergeBlocks(this.rootStore.blockStore.blocksForMerge, this.rootStore.blockStore.blocks, serverBlocks);
          // We let the server handle metadata saving order
          // ie if we updated the cover image and someone else did, we just take the latest from the
          // server
          payload.proposal = response.proposal;
          this.setFromSingleProposal(payload, response.blocks);
          this.rootStore.editorStore.saved();
        });
      })
      .catch(() => this.rootStore.editorStore.savingFailed());
  }

  @action rename(title: string) {
    this.current.title = title;
    this.debouncedSave();
  }

  @action addTag(tag: string) {
    this.current.tags.push(tag);
    this.debouncedSave();
  }

  @action removeTag(tag: string) {
    this.current.tags = this.current.tags.filter(t => t !== tag);
    this.debouncedSave();
  }

  @action setClient(client: string | number | null) {
    this.current.clientId = client;
    this.debouncedSave();
  }

  @action setCoverImage(url: string) {
    this.current.coverImageUrl = url;
    this.debouncedSave();
  }

  @action publishCurrent(): Promise<any> {
    return fetchling(`/proposals/${this.current.id}/share`).post({});
  }

  @action markAsSent(): Promise<any> {
    return fetchling(`/proposals/${this.current.id}/mark-as-sent`).post({});
  }

  @action sendEmailToClient(data: any): Promise<any> {
    return fetchling(`/proposals/${this.current.id}/share-email`).post(data);

  }
}

