import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";

import SettingsContainer from "./SettingsContainer";
import Dialog from "../core/Dialog";
import Plans from "./payments/Plans";
import Card from "./payments/Card";
import BillingStatus from "./payments/BillingStatus";
import InvoiceList from "./payments/InvoiceList";
import rootStore from "../../stores/RootStore";
import router from "../../routes";

declare var ChargeBee: any;

enum EmbedPageKind {
  New,
  Update,
}

@observer
export class BillingRoute extends React.Component<{}, {}> {
  @observable jsLoaded = false;
  @observable paymentDone = false;
  @observable hostedPage: {
    url: string;
    id: string;
    siteName: string;
  } | null = null;
  @observable kindPage: EmbedPageKind | null = null;

  componentDidMount() {
    document.title = `Proppy - Billing settings`;

    // Use normal DOM API to lazily load chargebee. Rendering a script
    // tag with react doesn't toggle a load for some reason.
    let chargebeeJs: any = document.getElementById("chargebee-js");
    if (chargebeeJs === null) {
      chargebeeJs = document.createElement("script");
      chargebeeJs.src = "https://js.chargebee.com/v1/chargebee.js";
      chargebeeJs.id = "chargebee-js";
      chargebeeJs.onload = () => {
        this.jsLoaded = true;
      };
      document.body.appendChild(chargebeeJs);
    } else {
      this.jsLoaded = true;
    }
  }

  componentDidUpdate() {
    // Only admins allowed
    if (rootStore.userStore.me && !rootStore.userStore.me.isAdmin) {
      router.navigate("settings-account", {}, {replace: true});
    }

    const container = document.getElementById("chargebee-container");
    if (!container || !this.hostedPage || this.paymentDone) {
      return null;
    }

    ChargeBee.embed(this.hostedPage.url, this.hostedPage.siteName).load({
      addIframe: (iframe) => {
        iframe.scrolling = "auto";
        container.appendChild(iframe);
      },
      onSuccess: () => {
        return rootStore.billingStore.fetchSubSync().then(() => {
          if (this.kindPage === EmbedPageKind.New) {
            this.paymentDone = true;
          } else {
            this.reset();
          }
        });
      },
      onCancel: () => {
        this.reset();
      },
    });
  }

  showPaymentPage(planId: string) {
    this.kindPage = EmbedPageKind.New;
    rootStore.billingStore.getNewPaymentPage(planId).then((response: any) => this.hostedPage = response);
  }

  showUpdatePaymentPage() {
    this.kindPage = EmbedPageKind.Update;
    rootStore.billingStore.getUpdatePaymentPage().then((response: any) => this.hostedPage = response);
  }

  reset() {
    this.hostedPage = null;
    this.paymentDone = false;
    this.kindPage = null;
  }

  renderPaymentIframe() {
    if (!this.hostedPage) {
      return null;
    }

    if (this.paymentDone && this.kindPage === EmbedPageKind.New) {
      const actions = [
        {label: "Close", onClick: this.reset.bind(this)},
      ];

      return (
        <div>
          <Dialog title="Payment accepted" actions={actions} onClose={this.reset.bind(this)}>
            <div>
              Thank you for signing up & welcome aboard.
            </div>
          </Dialog>
        </div>
      );
    }

    return (
      <div>
        <Dialog title="" actions={[]} onClose={this.reset.bind(this)}>
          <div id="chargebee-container"></div>
        </Dialog>
      </div>
    );
  }

  changeSubscription(planId: string) {
    if (rootStore.billingStore.sub.isChargebeeSubscription) {
      rootStore.billingStore.changePlan(planId).then(() => this.reset());
      return;
    }

    this.showPaymentPage(planId);
  }

  render() {
    if (!rootStore.companyStore.us) {
      return null;
    }
    const sub = rootStore.billingStore.sub;

    return (
      <SettingsContainer>
        <div className="billing">
          <h2>Billing</h2>
          <BillingStatus />

          <hr/>

          <Plans onClick={this.changeSubscription.bind(this)} />

          {sub.isChargebeeSubscription
            ? <div className="billing__card">
                <Card updateCard={this.showUpdatePaymentPage.bind(this)}/>
              </div>
            : null}

          {sub.isChargebeeSubscription ? <InvoiceList /> : null}

          {this.renderPaymentIframe()}
        </div>
      </SettingsContainer>
    );
  }
}

export default BillingRoute;
