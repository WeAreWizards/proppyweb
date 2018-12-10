import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import Link from "../../core/Link";


import HeaderDropdown from "./HeaderDropdown";
import { SaveStatus } from "../../../interfaces";
import rootStore from "../../../stores/RootStore";
import {Routes} from "../../../routes";


interface IAppHeaderProps {
  inEditor: boolean;
}

// The header of the app and logged out page.
// If we have a user, display the options otherwise only display the logo
@observer
export class AppHeader extends React.Component<IAppHeaderProps, {}> {
  @observable dropdownOpen = false;

  goToPreview() {
    const previewUrl = window.location.pathname.replace("proposals", "preview");
    const tab = window.open(previewUrl, "_blank");
    if (tab) {
      tab.focus();
    }
  }

  renderPreviewButton() {
    if (!this.props.inEditor) {
      return null;
    }

    return (
      <div className="header__part">
        <button className="button" onClick={this.goToPreview.bind(this)}>
          Preview
        </button>
      </div>
    );
  }

  renderLoggedInBit() {
    const me = rootStore.userStore.me;
    if (!me) {
      return null;
    }

    let unconfirmed;
    if (!me.isActive) {
      unconfirmed = <span className="unconfirmed">(unconfirmed)</span>;
    }
    return (
      <div className="header__right">
        {this.renderPreviewButton()}
        <div
          className="header__part header-menu__option header-menu__dropdown"
          data-tour="settings"
          onMouseEnter={() => this.dropdownOpen = true}
          onMouseLeave={() => this.dropdownOpen = false}>
          {me.username} {unconfirmed} <span className="icon-arrow-down" />
            {this.dropdownOpen ? <HeaderDropdown /> : null}
        </div>
      </div>
    );
  }

  renderSaveStatus() {
    if (!this.props.inEditor) {
      return null;
    }
    const saveStatus = rootStore.editorStore.saveStatus;

    let text = <span/>;
    if (saveStatus === SaveStatus.SAVING) {
      text = <span>Saving...</span>;
    } else if (saveStatus === SaveStatus.SAVED) {
      text = <span>Saved</span>;
    } else if (saveStatus === SaveStatus.FAILED) {
      text = <span className="save-status--error">Failed</span>;
    }

    return (
      <div className="header__part save-status">
        {text}
      </div>
    );
  }

  renderDashboardLink() {
    // Hide dashboard link on the dashboard
    if (!rootStore.userStore.me || window.location.pathname === "/") {
      return null;
    }

    return (
      <div className="header__part">
        <Link to={Routes.Home}><span className="icon-book"/> Dashboard</Link>
      </div>
    );
  }

  render() {
    return (
      <header className={this.props.inEditor ? "header--fixed header" : "header"}>
        <div className="header__left">
          <div className="header__part"><img className="logo" src="/img/logo-black@2x.png" /></div>
          {this.renderDashboardLink()}
          {this.renderSaveStatus()}
        </div>
        {this.renderLoggedInBit()}
      </header>
    );
  }
}

export default AppHeader;
