import { observable, action, computed } from "mobx";

import { HoverKind, UIError } from "../interfaces";
import {Store} from "./RootStore";


export interface INotification {
  visible: boolean;
  isError: boolean;
  message: string;
  hideAfter: number;
  // extra actions are typed
  showUndo: boolean;
}


export class UIStore extends Store {
  @observable notification: INotification = {
    visible: false,
    message: "",
    isError: false,
    showUndo: false,
    hideAfter: Date.now(),
  };
  // comments open in the published proposal page
  @observable commentsOpenUid: string | null = null;
  // which block we are hovering on. Ensures only one is active at a time
  @observable hoveringBlock: {uid: string, kind: HoverKind} = {
    uid: "",
    kind: HoverKind.NONE,
  };
  @observable uiError: UIError = UIError.NONE;
  @observable needHigherPlanError = false;
  @observable needHigherPlanPublishState = "";

  // TODO: add an action notifyWithUndo;
  @action notify(message: string, isError: boolean, showUndo = false) {
    this.notification.visible = true;
    this.notification.message = message;
    this.notification.isError = isError;
    this.notification.showUndo = showUndo;
    this.notification.hideAfter = Date.now() + (isError ? 30 : 5) * 1000;
  }

  @action hideNotification() {
    this.notification.visible = false;
  }

  @action openComments(uid: string) {
    this.commentsOpenUid = uid;
  }

  @action closeComments() {
    this.commentsOpenUid = null;
  }

  @action setHoveringBlock(uid: string, kind: HoverKind) {
    // Do nothing when comments are open
    if (this.commentsAreOpen) {
      return;
    }
    this.hoveringBlock = this.hoveringBlock.uid === uid && kind === HoverKind.NONE
      ? {uid: "", kind}  // reset
      : {uid, kind};
  }

  @action resetHovering() {
    this.hoveringBlock = {uid: "", kind: HoverKind.NONE};
  }

  @action setUiError(kind: UIError) {
    this.uiError = kind;
  }

  @action showNeedHigherPlanError(messageEnum) {
    this.needHigherPlanPublishState = messageEnum;
    this.needHigherPlanError = true;
  }

  @action hideNeedHigherPlanError() {
    this.needHigherPlanError = false;
    this.needHigherPlanPublishState = "";
  }

  @computed get commentsAreOpen() {
    return this.commentsOpenUid !== null;
  }
}

