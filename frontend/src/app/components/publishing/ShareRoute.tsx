import * as React from "react";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import Cover from "../proposals/Cover";
import TableOfContents from "../proposals/TableOfContents";
import { unescape, getOffsetTop, getScrollTop } from "../../utils/html";
import { renderBlocks } from "../../utils/render";
import { brandProposal, cleanupBranding } from "../../utils/branding";
import { formatIsoDatetime } from "../../utils/dates";
import { setAnonUid } from "../../utils/auth";
import {RenderContext, UIError} from "../../interfaces";
import rootStore from "../../stores/RootStore";


declare var __API_BASE_URL__: string;

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
function toLocaleDateStringSupportsLocales() {
  try {
    new Date().toLocaleDateString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

// Very similar to the one in TableOfContents.tsx so we can probably refactor it
function findActiveSection(): string | null {
  const fromTop = getScrollTop();

  const currentlyActive = [];
  // NodeList -> Array is a bit ugly
  [].slice.call(document.querySelectorAll("[id^='container-']")).map(elem => {
    if (elem && getOffsetTop(elem) <= fromTop) {
      currentlyActive.push(elem.id.replace("container-", ""));
    }
  });

  // and we take the last one
  const activeBlock = currentlyActive[currentlyActive.length - 1] || null;
  if (!activeBlock) {
    return null;
  }

  return activeBlock;
}

@observer
export class ShareRoute extends React.Component<{}, {}> {
  componentDidMount() {
    document.title = `${rootStore.companyStore.us.name} - ${unescape(rootStore.sharedStore.proposal.title)}`;
    brandProposal(rootStore.companyStore.us.branding);
    setAnonUid();
    rootStore.sharedStore.sendLoadEvent();

    document.onclick = (e: any) => {
      e = e || window.event;
      const element = e.target || e.srcElement;
      if (element.tagName === "A" && element.getAttribute("href")[0] !== "#") {
        element.target = "_blank";
        rootStore.sharedStore.sendOutboundClickEvent(element.getAttribute("href"));
      }
    };

    // The unresolvable issue is that content before could be loading (iframe, pics) etc
    // so by the time the page is loaded, it might not be in view anymore
    const anchor = document.getElementsByName(window.location.hash);
    if (anchor.length === 1) {
      (anchor[0] as any).scrollIntoView();
    }

    setInterval(() => {
      rootStore.sharedStore.sendPingEvent(findActiveSection());
    }, 15000);
  }

  componentWillUnmount() {
    cleanupBranding();
    rootStore.sharedStore.clear();
  }

  getPDF() {
    const params = rootStore.routerStore.current.params;
    const shared = rootStore.sharedStore.proposal;
    const version = params.version || shared.version || 1;

    // assume unsigned and set to signed if we find a block with data.
    let signatureStatus = "u";
    rootStore.blockStore.blocks.forEach(b => { if (!!b.data.signature) { signatureStatus = "s"; } });

    window.open(
      `${__API_BASE_URL__}/render-pdf/${params.shareUid}/${version}/${signatureStatus}?${Date.now()}&title=${shared.title}`,
      "_blank",
    );
  }

  render() {
    const blocks = rootStore.blockStore.blocks;
    const shared = rootStore.sharedStore.proposal;

    if (rootStore.uiStore.uiError === UIError.NOT_FOUND) {
      return (
        <div id="global-error">
          <h3>Hmm the page you were looking for doesn't exist</h3>
        </div>
      );
    }

    const hasCover = shared.coverImageUrl !== "";

    // Margin top for proposal__container depends on whether or not we have
    // a cover image
    const containerClasses = classnames("proposal__container", {
      "proposal__container--has-cover": hasCover,
    });

    const proposalClasses = classnames("proposal-content", {
      "proposal-content--comments-open": rootStore.uiStore.commentsAreOpen,
    });

    const locale = (window.navigator as any).browserLanguage ||
      (window.navigator as any).userLanguage ||
      window.navigator.languages[0];
    const publishedDate = new Date(shared.createdAt * 1000);

    const date = toLocaleDateStringSupportsLocales()
      ? publishedDate.toLocaleDateString(locale, {year: "numeric", month: "long", day: "numeric"})
      : publishedDate.toLocaleDateString();

    return (
      <div className="shared">
        <div className={containerClasses}>
          <Cover proposal={shared} />
          <TableOfContents blocks={blocks} context={RenderContext.Share} />

          <div className="proposal-title restrict-width">
            <h1>{unescape(shared.title)}</h1>
            <p className="version">{date}</p>
          </div>
          <div className={proposalClasses}>
            {renderBlocks(rootStore.sharedStore.uid, blocks, RenderContext.Share)}
          </div>
        </div>
        <span className="icon-print" onClick={this.getPDF.bind(this)} />
      </div>
    );
  }
}

export default ShareRoute;
