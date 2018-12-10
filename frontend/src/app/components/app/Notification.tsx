import * as React from "react";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import rootStore from "../../stores/RootStore";


@observer
export class Notification extends React.Component<{}, {}> {
  timeoutId: number | null;

  hideNotification(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    rootStore.uiStore.hideNotification();
  }

  componentWillUpdate() {
    const notification = rootStore.uiStore.notification;

    if (notification.visible) {
      const timeout = notification.hideAfter - Date.now();
      window.clearTimeout(this.timeoutId);
      this.timeoutId = window.setTimeout(() => rootStore.uiStore.hideNotification(), timeout);
    }

    if (!notification.visible && this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  render() {
    const notification = rootStore.uiStore.notification;
    const notificationClasses = classnames("notification_popup", {
      "notification_popup--visible": notification.visible,
      "notification_popup--error": notification.isError,
    });

    const extraActions = [];
    if (notification.showUndo) {
      extraActions.push(
        <span key="undo" onClick={() => rootStore.blockStore.undo()} className="clickable notification_popup__action">
          Undo change
        </span>,
      );
    }

    return (
      <div className={notificationClasses}>
        {notification.message}
        <span onClick={this.hideNotification.bind(this)} className="clickable notification_popup__action">Hide</span>
        {extraActions}
      </div>
    );
  }

}

export default Notification;
