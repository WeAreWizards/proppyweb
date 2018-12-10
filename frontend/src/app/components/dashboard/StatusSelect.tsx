import * as React from "react";

import Select from "../core/select/Select";
import { DISPLAY_NAME } from "../../constants/status";
import rootStore from "../../stores/RootStore";


const STATUS_OPTIONS = [
  { value: "draft", label: DISPLAY_NAME.draft, icon: "icon-drafts" },
  { value: "sent", label: DISPLAY_NAME.sent, icon: "icon-sent" },
  { value: "won", label: DISPLAY_NAME.won, icon: "icon-won" },
  { value: "lost", label: DISPLAY_NAME.lost, icon: "icon-lost" },
];

function renderChoice(choice: any) {
  if (choice) {
    return (
      <span className="align-icons">
        <span className={choice.icon}/>{choice.label}
      </span>
    );
  }

  // We don't have a choice in the Trash tab in dashboard
  return (
    <span className="align-icons">Move to</span>
  );
}

interface IStatusSelectProps {
  proposalId: number;
  currentStatus: string;
}

// The dropdown allowing you to choose a status for the proposal.
// Used on dashboard and editor
export class StatusSelect extends React.Component<IStatusSelectProps, {}> {
  changeStatus(value: string) {
    const { proposalId, currentStatus } = this.props;
    if (value === currentStatus) {
      return;
    }
    rootStore.proposalStore.updateStatus(proposalId, value);
  }

  render() {
    const currentStatus = this.props.currentStatus;
    return (
      <Select
        value={currentStatus}
        className="proppy-select--status"
        options={STATUS_OPTIONS}
        onChange={this.changeStatus.bind(this)}
        renderChoice={renderChoice}
        allowSearch={false}
        allowCreate={false} />
    );
  }
}

export default StatusSelect;
