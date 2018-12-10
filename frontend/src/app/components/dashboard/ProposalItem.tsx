import * as React from "react";
import { observer } from "mobx-react";
import Link from "../core/Link";
import * as classnames from "classnames";


import StatusSelect from "./StatusSelect";
import { unescape } from "../../utils/html";

import { Proposal } from "../../stores/models/Proposal";
import rootStore from "../../stores/RootStore";
import {Routes} from "../../routes";


interface IProposalItemProps extends React.Props<{}> {
  proposal: Proposal;
}

declare var __SITE_BASE_URL__: string;


@observer
export class ProposalItem extends React.Component<IProposalItemProps, {}> {
  onDeleteClick() {
    const { proposal } = this.props;

    if (proposal.status !== "trash") {
      rootStore.proposalStore.updateStatus(proposal.id, "trash");
      return;
    }

    rootStore.proposalStore.delete(proposal.id);
  }

  renderMetadata() {
    const { signed, shareUid, clientId, shares, id } = this.props.proposal;
    const bits = [];


    if (clientId && rootStore.clientStore.clients.has((clientId as number).toString())) {
      const client = rootStore.clientStore.getClient(clientId as number);
      bits.push(
        <span key="1" className="proposal-item__client meta-item" onClick={() => rootStore.dashboardStore.setQueryClient(client.name)}>
          <span className="icon-client"/><span>{client.name}</span>
        </span>,
      );
    }

    if (shares.length > 0) {
      bits.push(
        <span key="6" className="meta-item">
          <Link to={Routes.Analytics} params={{id}}><span className="icon-show"/>Analytics</Link>
        </span>,
      );

      bits.push(
        <span key="5" className="meta-item">
          <a target="_blank" href={`${__SITE_BASE_URL__}/p/${shareUid}`}><span className="icon-open" />Open published proposal</a>
        </span>,
      );

      if (signed) {
        bits.push(<span key="7" className="meta-item"><b>Signed (read-only)</b></span>);
      }
    }

    return (
      <div className="proposal-item__meta">
        <div className="meta-items">
          {bits}
        </div>
      </div>
    );
  }

  // Renders title, client and last edit date on left and unseen comments on right
  renderUpper() {
    const { id, title } = this.props.proposal;

    const proposalTitle = unescape(title) || "Untitled";
    const proposalLink = this.props.proposal.isReadOnly()
      ? <span className="signed-proposal-title">{proposalTitle}</span>
      : <Link to={Routes.Editor} params={{id}}>{proposalTitle}</Link>;

    return (
      <div className="proposal-item__upper">
        <div className="proposal-item__info">
          <h4 className="proposal-item__title" data-tour="proposal-title">
            {proposalLink}
          </h4>
          {this.renderMetadata()}
        </div>
      </div>
    );
  }

  renderActions() {
    const { proposal } = this.props;

    if (proposal.status !== "trash") {
      return (
        <div className="proposal-item__actions" data-tour="proposal-actions">
          {proposal.signed
            ? ""
            : <span className="align-icons proposal-action" onClick={this.onDeleteClick.bind(this)}>
                <span className="icon-trash"/> <span>Delete</span>
              </span>
          }
            {proposal.signed
              ? <span className="align-icons"><span className="icon-won" /> Won </span>
              : <span className=" proposal-action">
                  <StatusSelect currentStatus={proposal.status} proposalId={proposal.id} />
                </span>
            }
          <span className="align-icons proposal-action" onClick={() => rootStore.proposalStore.duplicate(proposal.id)}>
            <span className="icon-duplicate"/> <span>Duplicate</span>
          </span>
        </div>
      );
    }

    return (
        <div className="proposal-item__actions">
          <span className="align-icons  proposal-action" onClick={this.onDeleteClick.bind(this)}>
            <span className="icon-bomb"/> <span>Delete permanently</span>
          </span>
          <span className="proposal-action">
            <StatusSelect currentStatus={null} proposalId={proposal.id} />
          </span>
        </div>
      );
  }

  // Renders tags on left and actions on right
  renderLower() {
    const { proposal } = this.props;
    const tags = proposal.tags.map((tag, i) => {
      return <span key={i} className="tag tag--is-action" onClick={() => rootStore.dashboardStore.setQueryTag(tag)}>{tag}</span>;
    });

    return (
      <div className="proposal-item__lower">
        {/* nbsp is needed to avoid collapse of div on no tags */}
        <div className="proposal-item__tags">{tags} &nbsp;</div>
        {this.renderActions()}
      </div>
    );
  }

  render() {
    const { status } = this.props.proposal;
    const classes = classnames("proposal-item__container", `is-${status}`);
    return (
      <div className="proposal-item" data-tour="proposal-item">
        <div className={classes}>
          {this.renderUpper()}
          {this.renderLower()}
        </div>
      </div>
    );
  }
}

export default ProposalItem;
