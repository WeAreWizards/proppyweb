import * as React from "react";
import Link from "../../core/Link";

import rootStore from "../../../stores/RootStore";
import {Routes} from "../../../routes";


// The dropdown when clicking on the top right of the toolbar,
// shows settings/company/team/logout
export class HeaderDropdown extends React.Component<{}, {}> {
  render() {
    return (
      <ul className="header__dropdown">
        <li><Link to={Routes.SettingsAccount}>Account</Link></li>
        <li><Link to={Routes.SettingsCompany}>Company</Link></li>
        <li><Link to={Routes.SettingsTeam}>Team</Link></li>
        <li><Link to={Routes.SettingsClients}>Clients</Link></li>
        <li><Link to={Routes.SettingsBranding}>Branding</Link></li>
        <li><Link to={Routes.SettingsIntegration}>Integrations</Link></li>
        {rootStore.userStore.me.isAdmin ? <li><Link to={Routes.SettingsBilling}>Billing</Link></li> : null}
        <li onClick={() => rootStore.userStore.logout()}>Logout</li>
      </ul>
    );
  }
}


export default HeaderDropdown;
