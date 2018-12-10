import * as React from "react";
import { observer } from "mobx-react";
import Joyride from "react-joyride";

import Search from "./Search";
import Sidebar from "./Sidebar";
import ProposalItem from "./ProposalItem";
import Template from "./Template";

import { filterAndRank, stringifySearch } from "../../utils/search";
import { HOMEPAGE_TOUR } from "../../utils/tour";
import { SearchTermType } from "../../interfaces";

import rootStore from "../../stores/RootStore";


@observer
class DashboardRoute extends React.Component<{}, {}> {
  static fetchData() {
    return rootStore.dashboardStore.fetchData();
  }

  componentDidMount() {
    document.title = `Proppy - Dashboard`;
    const joyride = this.refs["joyride"] as any;
    if (joyride) {
      joyride.start(true);
    }
  }

  componentWillUnmount() {
    rootStore.dashboardStore.clearQuery();
  }

  finishOnboarding(data) {
    // for some reasons the finished callback is called on load
    // but with data.action === undefined
    if (data.type === "finished" && data.action) {
      rootStore.userStore.onboardingDone();
    }
    // skipping?
    if (data.action === "") {
      rootStore.userStore.onboardingDone();
    }
  }

  renderTour() {
    if (rootStore.userStore.me.onboarded) {
      return null;
    }
    const locale = {
      back: "Back",
      close: "Close",
      last: "End",
      next: "Next",
      skip: "Skip",
    };
    // We want the beginning of the tour to be centered in the middle
    // of the screen, pointing at nothing specific so we make up a 0px
    // by 0px centered div to point at:
    const tourAnchor = {position: "absolute" as any, width: "0px", height: "0px", left: "50%", top: "50%"};
    return (
      <div>
        <div style={tourAnchor} id="dashboard-tour-start"></div>
        <Joyride
          ref="joyride"
          steps={HOMEPAGE_TOUR}
          locale={locale}
          keyboardNavigation={false}
          disableOverlay={true}
          showBackButton={false}
          showSkipButton={true}
          callback={this.finishOnboarding.bind(this)}
          type="continuous" />
      </div>
    );
  }

  renderActiveTab() {
    const query = rootStore.dashboardStore.query;
    // We want the results ordered from the most recently edited to the least recent
    const proposals = filterAndRank(rootStore.proposalStore.proposals.values(), rootStore.clientStore.clients, query)
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
    const drafts = proposals.filter(p => p.status === "draft");
    const sent = proposals.filter(p => p.status === "sent");

    if (proposals.length === 0) {
      return (
        <div className="no-active-proposal">No active proposals</div>
      );
    }

    let draftsBody = null;
    if (drafts.length > 0) {
      draftsBody = (
        <div>
          <h3 className="dashboard__header">Drafts</h3>
          {drafts.map(proposal => {
            return <ProposalItem key={proposal.id} proposal={proposal} />;
          })}
        </div>
      );
    }

    let sentBody = null;
    if (sent.length > 0) {
      sentBody = (
        <div>
          <h3 className="dashboard__header">Sent</h3>
          {sent.map(proposal => {
            return <ProposalItem key={proposal.id} proposal={proposal} />;
          })}
        </div>
      );
    }

    return (
      <div>
        {drafts.length > 0 ? draftsBody : null}
        {sent.length > 0 ? sentBody : null}
      </div>
    );
  }


  renderProposals() {
    const proposals = [];
    const query = rootStore.dashboardStore.query;
    if (query.terms.length === 0) {
      return this.renderActiveTab();
    }

    const filtered = filterAndRank(rootStore.proposalStore.proposals.values(), rootStore.clientStore.clients, query);
    // We want the results ordered from the most recently edited to the least recent
    filtered.sort((a: any, b: any) => b.updatedAt - a.updatedAt).map(proposal => {
      proposals.push(
        <ProposalItem key={proposal.id} proposal={proposal} />,
      );
    });

    return proposals;
  }

  renderTemplates() {
    const templates = rootStore.dashboardStore.templates.map(tpl => {
      return <Template key={tpl.uid} title={tpl.title} uid={tpl.uid} />;
    });

    return (
      <div className="template-container">
        {templates}
      </div>
    );
  }

  renderDashboardContainerHeader() {
    if (rootStore.dashboardStore.isOnTemplatePage()) {
      return <h3 className="dashboard__header">Templates</h3>;
    }

    // We have the following rules: If there is just a status we want
    // to display just the header, e.g. "Drafts". If there is a status
    // + other search terms we want to show "Search results".
    const q = rootStore.dashboardStore.query;
    // Active tab will handle their own header
    if (q.terms.length === 0) {
      return null;
    }
    let name = "Active";

    if (q.terms.length === 1 && q.terms[0].type === SearchTermType.STATUS) {
      name = {
        draft: "Drafts",
        won: "Won",
        lost: "Lost",
        sent: "Sent",
        trash: "Trash",
      }[q.terms[0].term];
    } else {
      name = `Search results for "${stringifySearch(q).trim()}"`;
    }

    return <h3 className="dashboard__header">{name}</h3>;
  }

  render() {
    return (
      <div data-tour="dashboard">
        {this.renderTour()}
        <div className="dashboard__search-container">
          <Search />
          <button data-tour="plus" onClick={() => rootStore.proposalStore.create()} className="button button--round">
            <span className="icon-plus"/>
          </button>
        </div>
        <div id="dashboard">
          <Sidebar />
          <div className="dashboard__content">
            {this.renderDashboardContainerHeader()}
            {rootStore.dashboardStore.isOnTemplatePage() ? this.renderTemplates() : this.renderProposals()}
          </div>
        </div>
      </div>
    );
  }
}

export default DashboardRoute;
