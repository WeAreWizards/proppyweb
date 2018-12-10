import * as React from "react";
import { observer } from "mobx-react";

import rootStore from "../../stores/RootStore";
import router from "../../routes";


@observer
export class SettingsContainer extends React.Component<React.Props<{}>, {}> {
  renderUnactivatedNotice() {
    return (
      <div className="unactivated-account">
        <h3>Your account is not activated!</h3>
        <button className="button" onClick={() => rootStore.userStore.resendActivationEmail(rootStore.userStore.me.email)}>
          Resend activation email
        </button>
      </div>
    );
  }

  render() {
    const {children} = this.props;
    const pathname = window.location.pathname;

    const setActiveClass = (path) => {
      if (pathname === path) {
        return "settings__menu--active";
      }
    };

    return (
      <div className="settings">
        <div className="settings__content">
          <ul className="settings__menu">
            <li className={setActiveClass("/settings/account")}
                onClick={() => router.navigate("settings-account")}>
              Account
            </li>
            <li className={setActiveClass("/settings/company")}
                onClick={() => router.navigate("settings-company")}>
              Company
            </li>
            <li className={setActiveClass("/settings/team")}
                onClick={() => router.navigate("settings-team")}>
              Team
            </li>
            <li className={setActiveClass("/settings/clients")}
                onClick={() => router.navigate("settings-clients")}>
              Clients
            </li>
            <li className={setActiveClass("/settings/branding")}
                onClick={() => router.navigate("settings-branding")}>
              Branding
            </li>
            <li className={setActiveClass("/settings/integrations")}
                onClick={() => router.navigate("settings-integrations")}>
              Integrations
            </li>
            {rootStore.userStore.me.isAdmin ? <li className={setActiveClass("/settings/billing")}
                onClick={() => router.navigate("settings-billing")}>
              Billing
            </li> : null}
          </ul>
          <div className="settings__body">
            {rootStore.userStore.me.isActive ? null : this.renderUnactivatedNotice()}
            {children}
          </div>
        </div>
      </div>
    );
  }
}


export default SettingsContainer;
