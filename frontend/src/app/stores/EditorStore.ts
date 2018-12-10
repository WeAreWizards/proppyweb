import { observable, action, computed } from "mobx";
import {SaveStatus, SearchDirection, InsertWhere} from "../interfaces";

import {Store} from "./RootStore";


export interface IDragAndDropState {
  activeUid: string;
  // next two needed for round-tripping data so it can be dispatched
  // and picked up by blocks.
  insertWhere: InsertWhere | null;
  targetUid: string | null;
}

export interface ISearchPixelPosition {
  start: number;
  left: number;
  direction: SearchDirection;
}

export class BlockToFocus {
  @observable uid: string;
  position: number;
  @observable searchPixelPos: ISearchPixelPosition | null;
  type: string | null;


  constructor(uid: string, position: number, type: string | null, searchPixelPos = null) {
    this.uid = uid;
    this.position = position;
    this.type = type;
    this.searchPixelPos = searchPixelPos;
  }
}

// Whether a value qualifies for the inline block changer
function shouldShowInlineBlockChanger(val: string): boolean {
  return val.length > 0
    && val[0] === "/"
    && val.indexOf(" ") === -1
    && val.indexOf("&nbsp;") === -1;
}


const NEVER = 1e12; // 11000 days in the future


// Handles all the editor specific ui state
export class EditorStore extends Store {
  @observable saveStatus: SaveStatus = SaveStatus.STANDBY;
  @observable saveRetry: null | {timer: number, count: number, intervalId: number} = null;
  @observable blockToFocus: BlockToFocus | null = null;
  @observable focusedBlockUid: string | null = null;
  @observable blockChanger: {uid: string, value: string} | null = null;
  @observable dndState: IDragAndDropState = {activeUid: null, insertWhere: null, targetUid: null};
  @observable saveErrorTimestamp: number = NEVER;

  @action retrySaving() {
    if (this.saveRetry.timer === 0) {
      // Bypass the debounce
      this.rootStore.proposalStore.performSave(true);
      const backOff = 5 + Math.floor(Math.random() * Math.pow(2.5, this.saveRetry.count));
      this.saveRetry.count += 1;
      this.saveRetry.timer = backOff;
    }
    this.saveRetry.timer -= 1;
  }

  @action startSaving() {
    this.saveStatus = SaveStatus.SAVING;
  }

  @action savingFailed() {
    this.saveStatus = SaveStatus.FAILED;
    if (this.saveErrorTimestamp === NEVER) {
      this.saveErrorTimestamp = window.performance.now();
    }

    const now = window.performance.now();
    const delta = now - this.saveErrorTimestamp;
    // We consider saving to have failed if we haven't saved either
    // blocks or proposal data successfully for more than 10 seconds.
    if (!this.saveRetry && delta > 10000) {
      // Start the exponential back-off timer with 3 seconds
      this.saveRetry = {timer: 3, count: 1, intervalId: setInterval(this.retrySaving.bind(this), 1000)};
      return;
    }
  }

  @action saved() {
    this.saveStatus = SaveStatus.SAVED;
    if (this.saveRetry) {
      clearInterval(this.saveRetry.intervalId);
    }
    setTimeout(() => this.saveStatus = SaveStatus.STANDBY, 2000);
    this.saveRetry = null;
    this.saveErrorTimestamp = NEVER;
  }

  // called when adding/removing/moving blocks in the blockStore
  @action focusOnBlock(uid: string, position: number, type: string | null, spp?: ISearchPixelPosition) {
    this.blockToFocus = new BlockToFocus(uid, position, type, spp);
  }

  // called by ContentEditable onFocus
  @action setFocusedBlock(uid: string | null) {
    this.focusedBlockUid = uid;
    if (this.blockToFocus) {
      this.blockToFocus.uid = uid;
    }
    // reset block changer if the focus changed
    if (this.blockChanger && this.blockChanger.uid !== uid) {
      this.blockChanger = null;
    }
  }

  // called when writing into a paragraph
  @action updateBlockChanger(uid: string, value: string) {
    if (!shouldShowInlineBlockChanger(value)) {
      this.blockChanger = null;
      return;
    }
    this.blockChanger = {uid, value};
  }

  @action hideBlockChanger() {
    this.blockChanger = null;
  }

  @action startDragging(uid: string) {
    this.dndState = {activeUid: uid, insertWhere: null, targetUid: null};
  }

  @action setDropInsertion(targetUid: string | null, insertWhere: InsertWhere) {
    this.dndState.insertWhere = insertWhere;
    this.dndState.targetUid = targetUid;
  }

  @action stopDragging() {
    this.dndState = {activeUid: null, insertWhere: null, targetUid: null};
  }

  // sets back everything to default values
  @action reset() {
    this.saveStatus = SaveStatus.STANDBY;
    if (this.saveRetry) {
      clearInterval(this.saveRetry.intervalId);
      this.saveRetry = null;
    }
    this.blockToFocus = null;
    this.focusedBlockUid = null;
    this.blockChanger = null;
    this.dndState = {activeUid: null, insertWhere: null, targetUid: null};
    this.saveErrorTimestamp = NEVER;
  }

  @computed get hasSaveError() {
    return this.saveRetry !== null;
  }

  @computed get isSaving() {
    return this.saveStatus === SaveStatus.SAVING;
  }
}

