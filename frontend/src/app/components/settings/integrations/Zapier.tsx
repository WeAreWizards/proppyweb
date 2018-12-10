import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";


interface IZapierIntegrationProps {
  close: any;
}

@observer
export class ZapierIntegration extends React.Component<IZapierIntegrationProps, {}> {
  @observable disableForm = false;

  addIntegration(state) {
    this.disableForm = true;
    rootStore.companyStore.addIntegrationToken("Zapier", state["token"])
      .then(() => this.disableForm = false)
      .catch(() => this.disableForm = false);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Integrate with Zapier build Zapps for Proppy</p>
        <p>
          When enabling this integration we will provide you with an api
          key that you give to Zapier.
        </p>
        <p>
        <button className="button" onClick={() => rootStore.companyStore.enableZapierIntegration()}>Enable</button>
        </p>
      </div>
    );
  }

  renderIntegrated() {
    return (
      <div className="integration-dialog__body">
        <div className="disable-integration">
        <p>
          Your API key is:
        </p>
        <p>
          <code>{rootStore.companyStore.us.integrations.zapier.apiKey}</code>
        </p>
        <p>
          Our Zapier integration is currently not public, send us an email at
          &nbsp;<a href="mailto:team@proppy.io">team@proppy.io</a> to get
          an invite.
        </p>
        <p>
          Disabling the integration will make all your Proppy Zapps stop working.
        </p>
        <p>
          <button className="button button--dangerous" onClick={() => rootStore.companyStore.disableZapierIntegration()}>Disable</button>
        </p>
        </div>
      </div>
    );
  }

  render() {
    const hasIntegration = rootStore.companyStore.us.integrations.zapier;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/zapier-logo@2x.png" alt="Zapier logo"/>
            <div>
              <h3>Zapier</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default ZapierIntegration;
