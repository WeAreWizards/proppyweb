import * as React from "react";
import { observer } from "mobx-react";

import InAppForm from "../core/forms/InAppForm";
import SettingsContainer from "./SettingsContainer";
import Teammate from "./team/Teammate";
import rootStore from "../../stores/RootStore";



const INPUTS = {
  email: {
    type: "email",
    label: "Email address",
  },
};

@observer
export class Team extends React.Component<{}, {}> {
  componentDidMount() {
    document.title = `Proppy - Team settings`;
  }

  renderUsers() {
    return rootStore.userStore.users.values().map(user => {
      return (<Teammate key={user.id} user={user} />);
    });
  }

  renderForm() {
    return (
      <div className="invite-team">
        <h2>Invite your team mates to work with you on Proppy</h2>
        <InAppForm
          resetOnSuccess
          inline={true}
          submitText="Invite"
          inputs={INPUTS}
          onSubmit={(data) => rootStore.userStore.inviteUser(data)} />
    </div>
      );
  }

  render() {
    if (!rootStore.companyStore.us) {
      return null;
    }

    return (
      <SettingsContainer>
        <div className="team">
          {rootStore.userStore.me.isAdmin ? this.renderForm() : null}
          <div className="team-list">
            {this.renderUsers()}
          </div>
        </div>
      </SettingsContainer>
    );
  }
}


export default Team;
