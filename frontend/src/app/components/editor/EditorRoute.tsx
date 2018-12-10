import * as React from "react";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import WysiwygToolbar from "./interface/WysiwygToolbar";
import ProposalMetadata from "./interface/ProposalMetadata";
import BlockChangerBody from "./interface/BlockChangerBody";
import Dialog from "../core/Dialog";
import { renderBlocks } from "../../utils/render";
import { setCaret, findHorizontalPixelPos } from "../../utils/selection";
import { KEY_CODES } from "../../constants/events";
import { RenderContext, InsertWhere } from "../../interfaces";
import rootStore from "../../stores/RootStore";
import router from "../../routes";


@observer
export class EditorRoute extends React.Component<{}, {}> {
  dndIntervalId: any = null;
  dndDelta: any;

  componentDidMount() {
    document.title = `Proppy - Editor`;
    const proposal = rootStore.proposalStore.current;
    if (proposal && proposal.isReadOnly()) {
      // Redirects to dashboard
      router.navigate("home", {}, {replace: true});
    }
  }

  componentWillUnmount() {
    clearInterval(this.dndIntervalId);
    this.dndIntervalId = null;
    rootStore.proposalStore.clearCurrent();
    rootStore.editorStore.reset();
  }

  enableDndUx() {
    // We have to simulate drag and drop because we have to override
    // the editor state anyway and can this way we can make scrolling less
    // frustrating as well as giving nicer feedback.
    //
    // Sadly modelling this in React is a lot of work, so we're doing
    // a special mode in which we interact directly with the DOM.
    if (this.dndIntervalId === null) {
      this.dndIntervalId = window.setInterval(() => { window.scrollBy(0, this.dndDelta); }, 33);
    }
    document.body.style.cursor = "move";

    const handleMouseMove = (ev: MouseEvent) => {
      const scale = 3.0;
      const y = ev.pageY - window.pageYOffset;
      const height = window.innerHeight;

      // TODO should probably be a polynomial instead of exp?
      const top = y < 100 ? Math.exp((100 - y) / 100 * scale + 1) : 0;
      const bottom = y > height - 100 ? Math.exp((y - height + 100) / 100 * scale + 1) : 0;

      this.dndDelta = top > 0 ? -top : (bottom > 0 ? bottom : 0);
    };

    const cleanup = () => {
      window.clearInterval(this.dndIntervalId);
      this.dndIntervalId = null;
      // tslint:disable-next-line
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.style.cursor = "inherit";
    };

    const handleMouseUp = () => {
      const dndState = rootStore.editorStore.dndState; // call this within handleMouseUp to avoid variable capture
      rootStore.blockStore.dropBlockOn(dndState.activeUid, dndState.targetUid, dndState.insertWhere);
      rootStore.editorStore.stopDragging();
      cleanup();
    };

    const handleKeyPress = (ev: KeyboardEvent) => {
      if (ev.which !== KEY_CODES.Escape) {
        return;
      }
      rootStore.editorStore.stopDragging();
      cleanup();
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyPress);
  }

  componentDidUpdate() {
    if (rootStore.editorStore.dndState.activeUid !== null) {
      this.enableDndUx();
    }

    // Handle different types of focus change. If the currently
    // focused block doesn't have the same UID as expected we force a
    // change.
    const blockToFocus = rootStore.editorStore.blockToFocus;
    try {
      if (blockToFocus && blockToFocus.uid !== rootStore.editorStore.focusedBlockUid) {
        const node = document.getElementById(blockToFocus.uid);
        if (node && document.activeElement !== node) {
          node.focus();
          if (blockToFocus.position > 0) {
            setCaret(node, blockToFocus.position);
          }
          const spp = blockToFocus.searchPixelPos;
          if (spp !== null) {
            findHorizontalPixelPos(node, spp.start, spp.left, spp.direction);
          }
        }
      }
    } catch (e) {
      // We have to catch all exceptions otherwise we hit the following bug:
      //  1/ create new section
      //  2/ leave section heading empty but enter text in paragraph
      //  3/ delete section
      //  4/ click undo
      //  5/ see reload
      // Now:
      //  1/ EditorRoute.tsx:componentDidUpdate fails in the range setting code
      console.log("Caret code broke again (sigh)", e); // tslint:disable-line
    }
  }

  renderSaveError() {
    if (!rootStore.editorStore.hasSaveError) {
      return;
    }

    const actions = [{label: "Retry now", onClick: () => rootStore.proposalStore.performSave(true), onClose: () => null}];
    return (
      <Dialog title="Problems saving" actions={actions}>
        The server is not responding. Retrying in {rootStore.editorStore.saveRetry.timer} seconds.
      </Dialog>
    );
  }

  renderDndInsertionDiv() {
    const dndState = rootStore.editorStore.dndState;

    if (dndState.activeUid === null || dndState.targetUid === null) {
      return null;
    }

    // We have to pick a single reference point for each block and we
    // can't do that in ducks/ui.ts because its state doesn't have
    // access to the blocks so we do the searching here. It's super
    // ugly but there's no other option.
    // TODO: move the code in a store following the comment above
    const ix = rootStore.blockStore.findIndex(dndState.targetUid);

    const gcrB = index => document.getElementById(rootStore.blockStore.blocks[index].uid).getBoundingClientRect().bottom;
    const gcrT = index => document.getElementById(rootStore.blockStore.blocks[index].uid).getBoundingClientRect().top;
    const isAbove = dndState.insertWhere === InsertWhere.Above;
    const top = ix > 0
      ? (isAbove ? gcrB(ix - 1) : gcrB(ix))
      : (isAbove ? gcrT(0) : gcrB(0));

    if (!document.getElementById(dndState.activeUid)) {
      return null;
    }
    const r = document.getElementById(dndState.activeUid).getBoundingClientRect();
    const style = {top: `${top + window.pageYOffset - 64}px`, left: `${r.left}px`};
    const innerStyle = {width: `${r.width}px`};

    return (
      <div className="block__content_insertion" style={style}>
        <div style={innerStyle}></div>
      </div>
    );
  }

  render() {
    // there to ensure mobx re-render on changes on them
    // TODO: there must be a better way
    // tslint:disable-next-line
    rootStore.editorStore.blockToFocus;
    // tslint:disable-next-line
    rootStore.editorStore.focusedBlockUid;

    const proposal = rootStore.proposalStore.current;
    // not sure why but EditorRoute sometimes render before it finishes the promise
    // to load data, so forcing wait
    if (!proposal) {
      return null;
    }

    if (proposal.signed) {
      return null;
    }

    const editorClass = `is-${proposal.status}`;
    const colourBarClasses = "editor-colour-bar " + editorClass;

    const contentClasses = classnames("proposal editor__content proposal-content", {
      "proposal-content--comments-open": rootStore.uiStore.commentsAreOpen,
    });

    return (
      <div id="editor" className={editorClass}>
        {this.renderDndInsertionDiv()}
        <div className={colourBarClasses}></div>
        <div className="editor-container">
          <ProposalMetadata proposal={proposal} />
          <WysiwygToolbar />
          {rootStore.editorStore.blockChanger !== null
            ? <BlockChangerBody
                uid={rootStore.editorStore.blockChanger.uid}
                proposalId={proposal.id}
                filter={rootStore.editorStore.blockChanger.value} />
            : null}
          <div className={contentClasses}>
            {renderBlocks(proposal.shareUid, rootStore.blockStore.blocks, RenderContext.Editor, rootStore.editorStore.dndState.activeUid)}
          </div>
        </div>
        {this.renderSaveError()}
      </div>
    );
  }
}

export default EditorRoute;
