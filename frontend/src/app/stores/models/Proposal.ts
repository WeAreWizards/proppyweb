import { observable } from "mobx";

export type PROPOSAL_STATUS = "draft" | "sent" | "won" | "lost" | "trash";

export interface IShare {
  version: number;
  sentTo: Array<string>;
  subject: string;
  from: string;
  body: string;
  createdAt: number;
}


export class Proposal {
  id: number;
  @observable title: string;
  status: PROPOSAL_STATUS;
  @observable coverImageUrl: string;
  @observable clientId?: number | string | null;
  shareUid: string;
  unseenCommentsCount: number;
  updatedAt: number;
  changedStatusAt: number;
  @observable tags: Array<string>;
  shares: Array<IShare>;
  signed: boolean;

  constructor(json: any) {
    Object.assign(this, json);
  }

  isReadOnly() {
    return this.signed || this.status === "won";
  }
}
