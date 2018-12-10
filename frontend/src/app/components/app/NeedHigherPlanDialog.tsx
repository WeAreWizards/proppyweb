import * as React from "react";

import Dialog from "../core/Dialog";
import rootStore from "../../stores/RootStore";
import router from "../../routes";

// This is shown when we receive a 402 from the server
export class NeedHigherPlanDialog extends React.Component<{}, {}> {
  goToBilling() {
    rootStore.uiStore.hideNeedHigherPlanError();
    router.navigate("settings-billing");
  }

  render() {
    const actions = [
      {label: "Go to billing", onClick: this.goToBilling},
    ];
    if (rootStore.uiStore.needHigherPlanPublishState === "trial_has_ended_please_subscribe") {
      return (
        <Dialog title="Your trial has ended" actions={actions} onClose={() => rootStore.uiStore.hideNeedHigherPlanError()}>
          <p>
            Thanks for giving us a go! If you like us you can sign up in our billing center.
          </p>
        </Dialog>
       );
    } else {
      return (
        <Dialog title="Bigger plan needed" actions={actions} onClose={() => rootStore.uiStore.hideNeedHigherPlanError()}>
          <p>
          It looks like you've been active! Sadly that means you can't fit any more active proposals into your current plan.
          </p>
          <p>
            You can either upgrade or change the status of some of your active proposals.
          </p>
        </Dialog>
       );
    }
  }
}

export default NeedHigherPlanDialog;
