import * as React from "react";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import rootStore from "../../stores/RootStore";

const STATUS_ICONS = {
  active: "icon-book",
  drafts: "icon-drafts",
  sent: "icon-sent",
  won: "icon-won",
  lost: "icon-lost",
  trash: "icon-trash",
  templates: "icon-templates",
};


@observer
export class Sidebar extends React.Component<{}, {}> {
  renderItem(status: string, name: string) {
    const term = rootStore.dashboardStore.currentStatusTerm;
    const proposals = rootStore.proposalStore.proposals.values();
    const classes = classnames(`status-${name}`, "align-icons",
      {active: term === status},
    );
    const total = status === ""
      ? proposals.filter(p => p.status === "sent" || p.status === "draft").length
      : proposals.filter(p => p.status === status).length;

    return (
      <li className={classes} onClick={() => rootStore.dashboardStore.setQueryStatus(status)}>
        <span className={STATUS_ICONS[name]} />
        {name} {status === "template" ? "" : <span className="right dashboard__sidebar__number">{total}</span>}
      </li>
    );
  }

  render() {
    // TODO: reset search on clicking on template?
    return (
      <div className="dashboard__sidebar" data-tour="dashboard-sidebar">
        <ul className="dashboard__sidebar__status">
          {this.renderItem("", "active")}
          {this.renderItem("draft", "drafts")}
          {this.renderItem("sent", "sent")}
          {this.renderItem("won", "won")}
          {this.renderItem("lost", "lost")}
          {this.renderItem("trash", "trash")}
        </ul>
        <ul className="dashboard__sidebar__other">
          {this.renderItem("template", "templates")}
        </ul>
      </div>
    );
  }
}

export default Sidebar;
