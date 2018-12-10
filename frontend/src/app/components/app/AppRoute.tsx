import * as React from "react";
import { observer } from "mobx-react";

import AppHeader from "./header/AppHeader";
import Notification from "./Notification";
import NeedHigherPlanDialog from "./NeedHigherPlanDialog";
import Overlay from "../core/Overlay";
import { isLoggedIn } from "../../utils/auth";
import { UIError } from "../../interfaces";
import rootStore from "../../stores/RootStore";


@observer
export class AppRoute extends React.Component<React.Props<{}>, {}> {
  render() {
    const error = rootStore.uiStore.uiError;
    if (error === UIError.INTERNAL_ERROR) {
      return (
        <div id="global-error">
          <h3>Our server encountered an error. We have been informed and are trying to fix it</h3>
        </div>
      );
    }
    if (error === UIError.NETWORK_PROBLEM) {
      return (
        <div id="global-error">
          <h3>It seems our server went on holiday! Please retry again in a bit.</h3>
        </div>
      );
    }

    if (error === UIError.NOT_FOUND || error === UIError.UNAUTHORIZED) {
      return (
        <div id="global-error">
          <h3>Hmm the page you were looking for doesn't exist</h3>
        </div>
      );
    }

    // You can be logged in the activate page but we don't load the user on
    // userStore.me for logged out page so it would render null in that case.
    if (isLoggedIn() && window.location.pathname.indexOf("/activate/") !== 0) {
      if (rootStore.userStore.me === null) {
        return null;
      }
      return (
        <div>
          <AppHeader inEditor={window.location.pathname.indexOf("/proposals/") === 0} />
          {this.props.children}
          {rootStore.uiStore.needHigherPlanError ? <NeedHigherPlanDialog /> : null}
          <Notification />
          {rootStore.routerStore.showLoadingScreen ? this.renderLoading() : null}
        </div>
      );
    }

    return (
      <div>
        <AppHeader inEditor={false} />
        <div id="constrained-container">
          {this.props.children}
        </div>
      </div>
    );
  }

  private renderLoading() {
    return (
      <Overlay>
        <div className="spinner">
          <div className="bounce1" />
          <div className="bounce2" />
          <div className="bounce3" />
        </div>
      </Overlay>
    );
  }
}

export default AppRoute;
