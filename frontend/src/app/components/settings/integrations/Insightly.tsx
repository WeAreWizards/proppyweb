import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";
import TextForm from "../../core/forms/TextForm";


interface InsightlyIntegrationProps {
  close: any;
}

const HELP_URL = "https://support.insight.ly/hc/en-us/articles/204864594-Finding-your-Insightly-API-key";

@observer
export class InsightlyIntegration extends React.Component<InsightlyIntegrationProps, {}> {
  @observable disableForm = false;

  addIntegration(state) {
    this.disableForm = true;
    rootStore.companyStore.addIntegrationToken("Insightly", state["token"])
      .then(() => this.disableForm = false)
      .catch(() => this.disableForm = false);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Import your contacts from Insightly and have them synced automatically to Proppy</p>
        <p>
          Please insert your API key below.
          Follow the instructions on <a target="_blank" href={HELP_URL}>this page</a> to get it.
          The token will look like "bc89081e-7632-48f5-93cd-a23523b91963".
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
                  onClick={() => rootStore.companyStore.removeIntegrationToken("Insightly")}>
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
    const hasIntegration = rootStore.companyStore.us.integrations.insightly;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/insightly-logo@2x.png" alt="Insightly logo"/>
            <div>
              <h3>Insightly</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default InsightlyIntegration;
