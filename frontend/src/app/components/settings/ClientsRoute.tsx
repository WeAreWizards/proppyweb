import * as React from "react";
import { observer } from "mobx-react";


import InAppForm from "../core/forms/InAppForm";
import InlineInput from "../core/forms/InlineInput";
import SettingsContainer from "./SettingsContainer";
import rootStore from "../../stores/RootStore";
import { Client } from "../../stores/models/Client";
import { prettyIntegrationName } from "../../utils/integrations";


const INPUTS = {
  name: {
    type: "text",
    label: "Client's name",
  },
};


@observer
export class Clients extends React.Component<{}, {}> {
  componentDidMount() {
    document.title = `Proppy - Clients`;
  }

  renderIntegrationClient(client: Client) {
    return (
      <div className="client client--integration" key={client.id}>
        <span>{client.name} — from {prettyIntegrationName(client.source)}</span>
      </div>
    );
  }

  renderClients() {
    return rootStore.clientStore.clients.values().map(client => {
      if (client.source !== "") {
        return this.renderIntegrationClient(client);
      }
      return (
        <div className="client" key={client.id}>
          <span onClick={() => rootStore.clientStore.deleteClient(client.id)} className="icon-delete" />
          <InlineInput
            value={client.name}
            onEnter={(value) => rootStore.clientStore.updateClient(client.id, value)} />
        </div>
      );
    });
  }

  renderForm() {
    return (
      <InAppForm
        inline={true}
        resetOnSuccess
        submitText="Add client"
        inputs={INPUTS}
        onSubmit={(data) => rootStore.clientStore.createClient(data)} />
    );
  }

  render() {
    if (!rootStore.companyStore.us) {
      return null;
    }

    return (
      <SettingsContainer>
        <div className="clients">
          <h2>Manage your clients</h2>
          {this.renderForm()}
          <div className="clients-list">
            {this.renderClients()}
          </div>
        </div>
      </SettingsContainer>
    );
  }
}

export default Clients;
