import {action, observable} from "mobx";
import {State} from "router5";
import {Store} from "./RootStore";

export class RouterStore extends Store {
  @observable current: State;
  @observable asyncInProgress = false;
  // Only happens if the page wasn't loaded in less than 500ms
  @observable showLoadingScreen = false;
  loadingTimeout: null | number;

  @action setCurrent(state: State) {
    this.current = state;
    this.asyncInProgress = false;
    clearTimeout(this.loadingTimeout);
    this.showLoadingScreen = false;
  }

  @action startAsyncLoading() {
    this.asyncInProgress = true;
    this.loadingTimeout = setTimeout(() => this.showLoadingScreen = true, 500) as any;
  }
}

