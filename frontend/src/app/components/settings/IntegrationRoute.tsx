import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";

import rootStore from "../../stores/RootStore";
import SettingsContainer from "./SettingsContainer";
import SlackIntegration from "./integrations/Slack";
import ZohoCRMIntegration from "./integrations/ZohoCRM";
import InsightlyIntegration from "./integrations/Insightly";
import PipedriveIntegration from "./integrations/Pipedrive";
import StripeIntegration from "./integrations/Stripe";
import ZapierIntegration from "./integrations/Zapier";


enum Integration {
  Slack,
  ZohoCRM,
  Insightly,
  Pipedrive,
  Stripe,
  Zapier,
}


@observer
export class IntegrationRoute extends React.Component<{}, {}> {
  @observable dialog = null;

  closeDialog() {
    this.dialog = null;
  }

  renderDialog() {
    if (this.dialog === null) {
      return null;
    }

    if (this.dialog === Integration.Slack) {
      return <SlackIntegration close={this.closeDialog.bind(this)} />;
    }

    if (this.dialog === Integration.ZohoCRM) {
      return <ZohoCRMIntegration close={this.closeDialog.bind(this)} />;
    }

    if (this.dialog === Integration.Insightly) {
      return <InsightlyIntegration close={this.closeDialog.bind(this)} />;
    }

    if (this.dialog === Integration.Pipedrive) {
      return <PipedriveIntegration close={this.closeDialog.bind(this)} />;
    }

    if (this.dialog === Integration.Stripe) {
      return <StripeIntegration close={this.closeDialog.bind(this)} />;
    }

    if (this.dialog === Integration.Zapier) {
      return <ZapierIntegration close={this.closeDialog.bind(this)} />;
    }
  }

  render() {
    const hasSlack = rootStore.companyStore.us.integrations.slack !== null;
    const hasZohoCRM = rootStore.companyStore.us.integrations.zohocrm;
    const hasInsightly = rootStore.companyStore.us.integrations.insightly;
    const hasPipedrive = rootStore.companyStore.us.integrations.pipedrive;
    const hasStripe = rootStore.companyStore.us.integrations.stripe !== null;
    const hasZapier = rootStore.companyStore.us.integrations.zapier !== null;

    return (
      <SettingsContainer>
        {this.renderDialog()}

        <h2>Integrations</h2>

        <div className="integrations-container">

          <div className={`integration ${hasSlack ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.Slack}>
            <div className="integration__logo">
              <img src="/img/slack-logo@2x.png" alt="Slack logo" className="slack-logo" />
            </div>
            <div className="integration__info">
              <h3>Slack</h3>
            </div>
          </div>

          <div className={`integration ${hasZohoCRM ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.ZohoCRM}>
            <div className="integration__logo">
              <img src="/img/zoho-logo@2x.png" alt="Zoho logo" />
            </div>
            <div className="integration__info">
              <h3>Zoho CRM</h3>
            </div>
          </div>

          <div className={`integration ${hasInsightly ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.Insightly}>
            <div className="integration__logo">
              <img src="/img/insightly-logo@2x.png" alt="Insightly logo" />
            </div>
            <div className="integration__info">
              <h3>Insightly</h3>
            </div>
          </div>

          <div className={`integration ${hasPipedrive ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.Pipedrive}>
            <div className="integration__logo">
              <img src="/img/pipedrive-logo@2x.png" alt="Pipedrive logo" />
            </div>
            <div className="integration__info">
              <h3>Pipedrive</h3>
            </div>
          </div>

          <div className={`integration ${hasStripe ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.Stripe}>
            <div className="integration__logo">
              <img src="/img/stripe-logo@2x.png" alt="Stripe logo" />
            </div>
            <div className="integration__info">
              <h3>Stripe</h3>
            </div>
          </div>

          <div className={`integration ${hasZapier ? "integration--active" : ""}`}
               onClick={() => this.dialog = Integration.Zapier}>
            <div className="integration__logo">
              <img src="/img/zapier-logo@2x.png" alt="Zapier logo" />
            </div>
            <div className="integration__info">
              <h3>Zapier</h3>
            </div>
          </div>

        </div>
      </SettingsContainer>
    );
  }
}

export default IntegrationRoute;
