import * as React from "react";
import * as classnames from "classnames";

import Cover from "../proposals/Cover";
import TableOfContents from "../proposals/TableOfContents";
import { renderBlocks } from "../../utils/render";
import { unescape } from "../../utils/html";
import { brandProposal, cleanupBranding } from "../../utils/branding";
import { RenderContext } from "../../interfaces";
import rootStore from "../../stores/RootStore";
import router from "../../routes";


declare var __SITE_BASE_URL__: string;


export class PreviewRoute extends React.Component<{}, {}> {
  componentDidMount() {
    const proposal = rootStore.proposalStore.current;
    if (proposal && proposal.signed) {
      window.open(`${__SITE_BASE_URL__}/p/${proposal.shareUid}`);
    }

    document.title = `Proppy - Previewing ${proposal.title || "Untitled"}`;
    brandProposal(rootStore.companyStore.us.branding);

    document.onclick = (e: any) => {
      e = e || window.event;
      const element = e.target || e.srcElement;
      if (element.tagName === "A" && element.getAttribute("href")[0] !== "#") {
        element.target = "_blank";
      }
    };

    // The issue is that content before could be loading (iframe, pics) etc
    // so by the time the page is loaded, it might not be in view anymore
    const anchor = document.getElementsByName(window.location.hash);
    if (anchor.length === 1) {
      (anchor[0] as any).scrollIntoView();
    }
  }

  componentWillUnmount() {
    cleanupBranding();
  }

  renderPreventPublishMessage() {
    const me = rootStore.userStore.me;

    // Note the <br/>s which are necessary to make the message fit
    // into the margin. The "activation" text makes the
    // semi-transparent overlay higher but it's a bit of a special
    // case so not spending too much time on design.
    if (!me.isActive) {
      return(
        <div className="cant-publish-message">
          <span>Please activate <br/>your account <br/>to publish.</span>
          <br/>
          <a href="/settings/account">Re-send link</a>
        </div>
      );
    }

    // Company not allowed -> no sub
    return (
      <div className="cant-publish-message">
        <span>Please subscribe to publish more proposals.</span>
        <br/>
        {me.isAdmin
          ? <a href="/settings/billing">Subscribe here</a>
          : <span>Please ask your admin to subscribe</span>}
      </div>
    );
  }

  render() {
    const me = rootStore.userStore.me;
    const proposal = rootStore.proposalStore.current;
    const blocks = rootStore.blockStore.blocks;
    if (!proposal || proposal.signed) {
      return null;
    }

    const canPublish = me.canPublish(proposal);

    const hasCover = proposal.coverImageUrl !== "";
    // Margin top for proposal__container depends on whether or not we have
    // a cover image
    const containerClasses = classnames("proposal__container", {
      "proposal__container--has-cover": hasCover,
    });
    return (
      <div className="preview">
        <div className="preview__share">
          <button disabled={!canPublish}
                  className="button"
                  onClick={() => router.navigate("publish-settings", {id: proposal.id})}>
            Publish...
          </button>
          {canPublish ? null : this.renderPreventPublishMessage()}
        </div>
        <div className={containerClasses}>
          <Cover proposal={proposal} />
          <TableOfContents blocks={blocks} context={RenderContext.Preview} />

          <div className="proposal-title">
            <h1>{unescape(proposal.title)}</h1>
          </div>
          <div className="proposal-content">
            {renderBlocks(proposal.shareUid, blocks, RenderContext.Preview)}
          </div>
        </div>
      </div>
    );
  }
}

export default PreviewRoute;
