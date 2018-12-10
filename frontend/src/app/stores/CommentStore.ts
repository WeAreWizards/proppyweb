import { action, observable } from "mobx";

import { SharedComment, SharedCommentThread } from "./models/Comment";
import fetchling from "../utils/fetchling";

import {Store} from "./RootStore";


export class CommentStore extends Store {
  @observable threads: Array<SharedCommentThread> = [];

  @action loadSharedComments(data: any) {
    this.threads = data.map((thread: any) => {
      const comments = thread.comments.map(c => new SharedComment(c)).sort((x, y) => x.createdAt - y.createdAt);
      const t = new SharedCommentThread(thread);
      t.comments = comments;
      return t;
    });
  }

  @action addSharedComment(blockUid: string, comment: string, threadId?: number, username?: string | null): Promise<any> {
    const shareUid = this.rootStore.sharedStore.uid;
    const args: any = threadId ? {blockUid, threadId, comment} : {blockUid, comment};
    if (username !== null) {
      args.username = username;
    }
    // append it to the thread immediately as an optimistic update
    const now = Math.floor(Date.now() / 1000);
    // Two cases:
    // 1. Creating a new thread;
    if (!threadId) {
      const t = new SharedCommentThread({id: 0, blockUid});
      t.comments = [new SharedComment({id: 0, username: args.username, createdAt: now, comment})];
      this.threads.push(t);
    } else {
      // 2. appending to a thread
      const t = this.getByBlockUid(blockUid);
      if (t) {
        t.comments.push(new SharedComment({id: 0, username: args.username, createdAt: now, comment}));
      }
    }

    return fetchling(`/shared/${shareUid}/comments`).post(args)
      .then((response: any) => this.loadSharedComments(response.threads))
      .catch(() => {
        if (!threadId) {
          this.threads = this.threads.filter(x => x.id === 0);
        } else {
          const t = this.getByBlockUid(blockUid);
          if (t) {
            t.comments = t.comments.filter(x => x.id === 0);
          }
        }
      });
  }

  getByBlockUid(blockUid: string): SharedCommentThread | null {
    return this.threads.find(t => t.blockUid === blockUid) || null;
  }
}
