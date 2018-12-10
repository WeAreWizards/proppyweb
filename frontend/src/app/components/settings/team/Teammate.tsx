import * as React from "react";
import * as classnames from "classnames";

import rootStore from "../../../stores/RootStore";
import { User } from "../../../stores/models/User";


interface ITeammateProps extends React.Props<{}> {
  user: User;
}

export class Teammate extends React.Component<ITeammateProps, {}> {
  renderActions() {
    const me = rootStore.userStore.me;
    const numberAdmins = rootStore.userStore.numberAdminUsers;
    const { user } = this.props;
    // don't let admin do anything on themselves
    if (!me.isAdmin || user.id === me.id) {
      return null;
    }

    const isPending = !user.isActive;
    const isDisabled = user.disabled;
    const reInvite = isPending
      ? (<a onClick={() => rootStore.userStore.resendInviteEmail(user.email)}>Re-send invitation email</a>)
      : null;
    const reActivate = isPending
      ? (<a onClick={() => rootStore.userStore.resendActivationEmail(user.email)}>Re-send activation email</a>)
      : null;
    const disable = !isDisabled && !user.isAdmin
      ? (<a onClick={() => rootStore.userStore.disableUser(user.id)}>Disable user</a>)
      : null;
    const enable = isDisabled
      ? (<a onClick={() => rootStore.userStore.enableUser(user.id)}>Enable</a>)
      : null;
    const toggleAdmin = user.id !== me.id
      ? (
        <a
          onClick={() => rootStore.userStore.toggleUserAdmin(user.id)}
        >
          {numberAdmins > 1 && user.isAdmin ? "Remove admin" : "Make admin"}
        </a>
      )
      : null;

    // we use some keys to satisfy React but they don't have any meaning, they
    // just need to be unique
    const actions = [];
    if (reInvite || reActivate) {
      actions.push(<li key="1">{user.email === me.email ? reActivate : reInvite}</li>);
    }
    if (disable) {
      if (actions.length > 0) {
        actions.push(<span key="42"> • </span>);
      }
      actions.push(<li key="2">{disable}</li>);
    }
    if (enable) {
      if (actions.length > 0) {
        actions.push(<span key="43"> • </span>);
      }
      actions.push(<li key="3">{enable}</li>);
    }
    if (toggleAdmin) {
      if (actions.length > 0) {
        actions.push(<span key="44"> • </span>);
      }
      actions.push(<li key="4">{toggleAdmin}</li>);
    }

    if (actions.length === 0) {
      return null;
    }

    return (
      <ul className="teammate__actions">
        {actions}
      </ul>
    );
  }

  render() {
    const user = this.props.user;
    const isPending = !user.isActive;
    const isDisabled = user.disabled;

    const classes = classnames("teammate", {
      "teammate--pending": isPending,
      "teammate--disabled": isDisabled,
    });

    let status = user.isAdmin ? "Admin" : "Member";
    if (isPending && isDisabled) {
      status += " (pending and disabled)";
    } else if (isPending) {
      status += " (pending)";
    } else if (isDisabled) {
      status += " (disabled)";
    }
    return (
      <div className={classes}>
        <div className="teammate__info">
          <span className="teammate__username">{user.username}</span>
          <div className="teammate__email">
            {user.email}
          </div>
        </div>
        <div className="teammate__status">
          <span>{status}</span>
          <div>
            {this.renderActions()}
          </div>
        </div>
      </div>
    );
  }
}

export default Teammate;
