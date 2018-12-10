import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";
import TextForm from "../../core/forms/TextForm";


interface IPipedriveIntegrationProps {
  close: any;
}

const HELP_URL = "https://support.pipedrive.com/hc/en-us/articles/207344545-How-to-find-your-personal-API-key";

@observer
export class PipedriveIntegration extends React.Component<IPipedriveIntegrationProps, {}> {
  @observable disableForm = false;

  addIntegration(state) {
    this.disableForm = true;
    rootStore.companyStore.addIntegrationToken("Pipedrive", state["token"])
      .then(() => this.disableForm = false)
      .catch(() => this.disableForm = false);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Import your contacts from Pipedrive and have them synced automatically to Proppy</p>
        <p>
          Please insert your API key below.
          Follow the instructions on <a target="_blank" href={HELP_URL}>this page</a> to generate it.
          The token will look like "38fe2e0b769684504be08e863d9e8e05a371e5e9".
        </p>

        <TextForm inputs={{token: {type: "text", label: "API key"}}}
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
                  onClick={() => rootStore.companyStore.removeIntegrationToken("Pipedrive")}>
            Disable
          </button>

          <p>Your contacts are synced daily.</p>
          <p>
            Disabling the integration will delete all the Insightly contacts from our database,
            except the ones currently assigned to a proposal.
          </p>
        </div>
      </div>
    );
  }

  render() {
    const hasIntegration = rootStore.companyStore.us.integrations.pipedrive;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/pipedrive-logo@2x.png" alt="Pipedrive logo"/>
            <div>
              <h3>Pipedrive</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default PipedriveIntegration;
