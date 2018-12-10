export class SharedComment {
  id: number;
  threadId: number;
  comment: string;
  username: string;
  fromClient: boolean;
  // unix timestamp
  createdAt: number;

  constructor(json: any) {
    Object.assign(this, json);
  }
}

export class SharedCommentThread {
  id: number;
  sharedProposalId: number;
  blockUid: string;
  comments: Array<SharedComment>;
  resolved: boolean;

  constructor(json: any) {
    Object.assign(this, json);
  }
}
