import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";


interface IStripeIntegrationProps {
  close: any;
}

declare var __STRIPE_CLIENT_ID__: any;


@observer
export class StripeIntegration extends React.Component<IStripeIntegrationProps, {}> {
  @observable oauthInProgress = false;

  addIntegration(state) {
    rootStore.companyStore.addIntegrationToken("Stripe", state["token"]);
  }

  openStripeWindow() {
    event.preventDefault();
    // a string to identify the company that just added stripe in the oauth response
    const state = rootStore.companyStore.us.id;
    const popup = window.open(
      `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${__STRIPE_CLIENT_ID__}&scope=read_write&state=${state}`,
    );
    popup.focus();
    this.oauthInProgress = true;

    // and we listen on the popup close event to know when to re-fetch client
    const intervalId = window.setInterval(() => {
      if (popup.closed) {
        this.oauthInProgress = false;
        clearInterval(intervalId);
        rootStore.companyStore.fetchUs();
      }
    }, 200);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Let your clients pay for your proposals directly from Proppy</p>
        <p className="oauth-button-container">
          <a className="oauth-button" onClick={this.openStripeWindow.bind(this)}>
            <img height="33px" src="/img/stripe-connect@2x.png" alt="Stripe connect"/>
          </a>
        </p>
      </div>
    );
  }

  renderIntegrated() {
    return (
      <div className="integration-dialog__body">
        <div className="disable-integration">
          <button className="button button--dangerous"
                  onClick={() => rootStore.companyStore.disableStripeIntegration()}>
            Disable
          </button>
        </div>
      </div>
    );
  }

  render() {
    const hasIntegration = rootStore.companyStore.us.integrations.stripe;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/stripe-logo@2x.png" alt="Stripe logo"/>
            <div>
              <h3>Stripe</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default StripeIntegration;
