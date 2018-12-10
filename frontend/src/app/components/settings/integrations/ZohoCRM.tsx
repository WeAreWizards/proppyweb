import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";
import TextForm from "../../core/forms/TextForm";


interface IZohoCRMIntegrationProps {
  close: any;
}

const HELP_URL = "https://www.zoho.com/crm/help/api/using-authentication-token.html";

@observer
export class ZohoCRMIntegration extends React.Component<IZohoCRMIntegrationProps, {}> {
  @observable disableForm = false;

  addIntegration(state) {
    this.disableForm = true;
    rootStore.companyStore.addIntegrationToken("ZohoCRM", state["token"])
      .then(() => this.disableForm = false)
      .catch(() => this.disableForm = false);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Import your contacts from ZohoCRM and have them synced automatically to Proppy.</p>
        <p>
          Please enter your authentication token below.
          Follow the "Browser mode" instructions on <a target="_blank" href={HELP_URL}>this page</a> to get it.
          The token will look like "c96fba685f9a1486aec8f0c035140530".
        </p>

        <TextForm inputs={{token: {type: "text", label: "Authentication token"}}}
                  submitText="Sync contacts"
                  disabledForSubmit={this.disableForm}
                  onSubmit={this.addIntegration.bind(this)} />
      </div>
    );
  }

  renderIntegrated() {
    return (
      <div className="integration-dialog__body">
        <div className="disable-integration">
          <button className="button button--dangerous"
                  onClick={() => rootStore.companyStore.removeIntegrationToken("ZohoCRM")}>
            Disable
          </button>

          <p>Your contacts are synced daily.</p>
          <p>
            Disabling the integration will delete all the ZohoCRM contacts from our database,
            except the ones currently assigned to a proposal.
          </p>
        </div>
      </div>
    );
  }

  render() {
    const hasIntegration = rootStore.companyStore.us.integrations.zohocrm;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/zoho-logo@2x.png" alt="Zoho logo"/>
            <div>
              <h3>Zoho CRM</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default ZohoCRMIntegration;
