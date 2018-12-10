import * as React from "react";
import { observer } from "mobx-react";


import InAppForm from "../core/forms/InAppForm";
import SettingsContainer from "./SettingsContainer";
import rootStore from "../../stores/RootStore";


const PASSWORD_INPUTS = {
  currentPassword: {
    type: "password",
    label: "Current Password",
    minLength: 8,
  },
  newPassword: {
    type: "password",
    label: "New Password",
    note: "Minimum 8 characters",
    minLength: 8,
  },
};


@observer
export class AccountRoute extends React.Component<{}, {}> {
  componentDidMount() {
    document.title = `Proppy - Account settings`;
  }

  renderForm() {
    const USERNAME_INPUT = {
      displayName: {
        type: "text",
        label: "Username",
        initial: rootStore.userStore.me.username,
      },
    };

    return (
      <div>
        <h2>Account settings</h2>
        <h3>Username</h3>
        <InAppForm
          submitText="Update username"
          inputs={USERNAME_INPUT}
          onSubmit={(data) => rootStore.userStore.updateAccount(data)} />

        <hr/>

        <h3>Password</h3>
        <InAppForm
          resetOnSuccess
          submitText="Update password"
          inputs={PASSWORD_INPUTS}
          onSubmit={rootStore.userStore.updatePassword} />
      </div>
    );
  }

  render() {
    if (!rootStore.companyStore.us) {
      return null;
    }

    return (
      <SettingsContainer>
        {this.renderForm()}
      </SettingsContainer>
    );
  }
}

export default AccountRoute;
