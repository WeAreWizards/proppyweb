import * as React from "react";
import { observer } from "mobx-react";
import { computed } from "mobx";
import * as classnames from "classnames";


import SpeechBubble from "../comments/SpeechBubble";
import CommentBox from "../comments/CommentBox";
import Header from "../editor/blocks/Header";
import Paragraph from "../editor/blocks/Paragraph";
import Divider from "../editor/blocks/Divider";
import ListItem from "../editor/blocks/ListItem";
import Image from "../editor/blocks/Image";
import CostTable from "../editor/blocks/CostTable";
import Table from "../editor/blocks/Table";
import Signature from "../editor/blocks/Signature";
import Quote from "../editor/blocks/Quote";
import CostTableRender from "../proposals/CostTableRender";
import TableRender from "../proposals/TableRender";
import Embed from "../editor/blocks/Embed";
import Payment from "../editor/blocks/Payment";
import { isTextBlock, isListBlock, isHeaderBlock } from "../../utils/blocks";
import { removeBr } from "../../utils/html";
import { BLOCK_TYPES, TEXT_BLOCK_TAGS } from "../../constants/blocks";
import { HoverKind, RenderContext, InsertWhere } from "../../interfaces";


import { Block as BlockClass } from "../../stores/models/Block";
import rootStore from "../../stores/RootStore";



interface IBlockProps {
  shareUid: string;
  block: BlockClass;
  context: RenderContext;
  beingDragged: boolean;
}


@observer
export class Block extends React.Component<IBlockProps, {}> {
  isSharedPage: boolean;
  readOnly: boolean;

  @computed get hovering() {
    if (rootStore.uiStore.hoveringBlock.uid === this.props.block.uid) {
      return rootStore.uiStore.hoveringBlock.kind;
    }
    return HoverKind.NONE;
  }

  @computed get commentsOpen() {
    return rootStore.uiStore.commentsAreOpen && rootStore.uiStore.commentsOpenUid === this.props.block.uid;
  }

  constructor(props: IBlockProps) {
    super(props);
    this.readOnly = props.context !== RenderContext.Editor;
    this.isSharedPage = props.context === RenderContext.Share;
  }

  isEmptyTextBlock() {
    const block = this.props.block;
    return isTextBlock(block.type) && removeBr(block.data.value) === "";
  }

  getReadOnlyBlock() {
    const block = this.props.block;

    if (isTextBlock(block.type)) {
      const Tag = TEXT_BLOCK_TAGS[block.type];
      const value = block.data.value || "";
      // Ignore empty elements
      if (value.trim().length > 0) {
        return <Tag key={block.uid} dangerouslySetInnerHTML={{__html: block.data.value}} />;
      }
    }
    if (block.type === BLOCK_TYPES.Image) {
      return (
        <figure>
          <img key={block.uid} src={block.data.url} />
          <figcaption dangerouslySetInnerHTML={{__html: block.data.caption}} />
        </figure>
      );
    }

    if (block.type === BLOCK_TYPES.CostTable) {
      return <CostTableRender block={block} />;
    }

    if (block.type === BLOCK_TYPES.Table) {
      return <TableRender block={block.asTableBlock()} />;
    }

    if (block.type === BLOCK_TYPES.Divider) {
      return (
        <div className="proposal-divider" >
          <hr id={this.props.block.uid} />
        </div>
      );
    }

    if (block.type === BLOCK_TYPES.Quote) {
      const quote = block.data.quote.trim();
      // Bug from mobx transition, we were putting data in caption
      // instead of source
      let source = block.data.caption ? block.data.caption.trim() : "";
      if (block.data.source) {
        source = block.data.source.trim();
      }

      if (quote.length === 0) {
        return null;
      }
      return (
        <blockquote>
          <span className="icon-quotes-right" />
          <p dangerouslySetInnerHTML={{__html: quote}} />
          {source ? <footer dangerouslySetInnerHTML={{__html: source}} /> : null}
        </blockquote>
      );
    }

    if (block.type === BLOCK_TYPES.Embed) {
      return (
        <div className="iframe-container">
          <iframe src={block.data.url} frameBorder="0">
            <p>Embedded content: <a href={block.data.url}>{block.data.url}</a></p>
          </iframe>
          <figcaption dangerouslySetInnerHTML={{__html: block.data.caption}} />
          <p className="iframe-print" style={{display: "none"}}>
            <a href={block.data.url}>Embedded content</a>
          </p>
        </div>
      );
    }

    if (block.type === BLOCK_TYPES.Signature) {
      return <Signature context={this.props.context} block={block} />;
    }

    if (block.type === BLOCK_TYPES.Payment) {
      return <Payment context={this.props.context} block={block} />;
    }

    return null;
  }

  getEditableBlock() {
    const block = this.props.block;

    if (isHeaderBlock(block.type)) {
     return <Header block={block} />;
    }

    if (block.type === BLOCK_TYPES.Paragraph) {
     return <Paragraph block={block} />;
    }

    if (block.type === BLOCK_TYPES.Divider) {
      return <Divider block={block} />;
    }

    if (isListBlock(block.type)) {
      return <ListItem block={block} />;
    }

    if (block.type === BLOCK_TYPES.Image) {
      return <Image block={block} />;
    }

    if (block.type === BLOCK_TYPES.CostTable) {
      return <CostTable block={block} />;
    }

    if (block.type === BLOCK_TYPES.Signature) {
      return (
        <Signature context={RenderContext.Editor} block={block} />
      );
    }

    if (block.type === BLOCK_TYPES.Quote) {
      return <Quote block={block} />;
    }

    if (block.type === BLOCK_TYPES.Embed) {
      return <Embed block={block} />;
    }

    if (block.type === BLOCK_TYPES.Payment) {
      return <Payment context={RenderContext.Editor} block={block} />;
    }

    if (block.type === BLOCK_TYPES.Table) {
      return <Table block={block.asTableBlock()} />;
    }


    return null;
  }

  // whether we should hide the actions/comments
  shouldHideUI() {
    // No hover for small screens
    if (document.body.clientWidth < 900) {
      return true;
    }

    // no hover during DND
    if (rootStore.editorStore.dndState.activeUid !== null) {
      return true;
    }

    // No hover for empty elements or on preview
    if (this.isEmptyTextBlock() || this.props.context === RenderContext.Preview) {
      return true;
    }
  }

  onDrag(ev: React.DragEvent<any>) {
    rootStore.editorStore.startDragging(this.props.block.uid);
    ev.preventDefault();
  }

  renderActions() {
    // can't do anything in the preview
    if (this.readOnly || this.hovering === HoverKind.NONE) {
      // we still return an empty div for the mouse over
      return (
        <div className="block__actions" onMouseEnter={this.changeHoverState.bind(this, HoverKind.CONTAINERS)}>
        </div>
      );
    }

    const drag = (
      <div
        className="block-action"
        draggable
        onDragStart={this.onDrag.bind(this)}
        onMouseOver={this.changeHoverState.bind(this, HoverKind.ACTIONS)}>
        <span className="icon-move" />
      </div>
    );
    const del = (
      <div
        className="block-action block-action-2"
        onClick={() => rootStore.blockStore.removeWithUndo(this.props.block.uid)}
        onMouseOver={this.changeHoverState.bind(this, HoverKind.DELETE)}>
        <span className="icon-delete" />
      </div>
    );
    return (
      <div
        className="block__actions"
        onMouseOver={this.changeHoverState.bind(this, HoverKind.CONTAINERS)}>
        {drag}
        {del}
      </div>
    );
  }

  renderComments() {
    // Don't show comments for empty text blocks or on preview/editor
    if (this.isSharedPage === false || this.isEmptyTextBlock()) {
      return null;
    }

    const { block } = this.props;
    const thread = rootStore.commentStore.getByBlockUid(block.uid);
    const numberComments = thread === null ? 0 : thread.comments.length;

    // not hovering and having comments open? do nothing
    if (this.hovering === HoverKind.NONE && !this.commentsOpen && numberComments === 0) {
      return null;
    }

    if (!this.commentsOpen && (numberComments > 0 || this.hovering !== HoverKind.NONE) && !rootStore.uiStore.commentsAreOpen) {
      return (
        <div onMouseOver={this.changeHoverState.bind(this, HoverKind.ACTIONS)}>
          <SpeechBubble
            count={numberComments}
            big={true}
            showIfZero onClick={() => rootStore.uiStore.openComments(block.uid)} />
        </div>
      );
    }

    if (this.commentsOpen) {
      return <CommentBox isSharedPage={this.isSharedPage} thread={thread} uid={block.uid} />;
    }

    return null;
  }

  shouldComponentUpdate(nextProps: IBlockProps) {
    // If react updates a content editable with the cursor in it then
    // we lose focus & cursor position. To avoid that we don't
    // re-render blocks with new data when they are currently focused.
    //
    // This could lead to odd behaviour if we expect the block to
    // update such as the store having different content from the
    // block until the block syncs back to the store.
    //
    // There are a few exceptions though: Changing the block type always needs
    // a re-paint:
    if (this.props.block.type !== nextProps.block.type) {
      return true;
    }

    // if we click on the block toggle to add a /, re-render it
    if (
      nextProps.block.type === BLOCK_TYPES.Paragraph
      && this.props.block.data.value === ""
      && nextProps.block.data.value === "/"
    ) {
      return true;
    }

    // Another disgusting hack: Quotes have two content-editables, one
    // has id "UID", the other "UID-footer". We need to map them to
    // the main block UID so we can detect whether the block active
    // and therefore not to be updated on prop changes (fixes RTL writing)
    const justUid = (x: string) => {
      const matched = x === null ? null : x.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
      return matched === null ? null : matched[0];
    };

    return justUid(rootStore.editorStore.focusedBlockUid) !== this.props.block.uid;
  }

  changeHoverState(kind: HoverKind, event: React.SyntheticEvent<any>) {
    if (this.shouldHideUI()) {
      return;
    }
    // We want hover color for actions and comments so don't bubble the event up
    event.stopPropagation();
    rootStore.uiStore.setHoveringBlock(this.props.block.uid, kind);
  }

  selectInsertionPos(ev: React.MouseEvent<any>) {
    if (rootStore.editorStore.dndState.activeUid === null) {
      return;
    }

    if (this.props.beingDragged) {
      // if we're being dragged then you can't insert into us
      rootStore.editorStore.setDropInsertion(null, InsertWhere.Below);
      return;
    }

    const r = (this.refs["blocknode"] as any).getBoundingClientRect();
    // r.height excludes the margin and because users will use the
    // visible content to navigate we use "r.bottom - r.height" instead of
    // "r.top + h / 2"
    const y = ev.pageY - window.pageYOffset;

    if (y > r.bottom - r.height / 2) {
      rootStore.editorStore.setDropInsertion(this.props.block.uid, InsertWhere.Below);
    } else {
      rootStore.editorStore.setDropInsertion(this.props.block.uid, InsertWhere.Above);
    }
  }

  render() {
    const component = this.readOnly ? this.getReadOnlyBlock() : this.getEditableBlock();
    if (component === null) {
      return null;
    }
    const block = this.props.block;

    let blockClasses = classnames({
      "block--hovering-actions": this.hovering === HoverKind.ACTIONS || this.commentsOpen,
      "block--hovering-delete": this.hovering === HoverKind.DELETE,
      "block-being-dragged": this.props.beingDragged,
      "block--divider": block.type === BLOCK_TYPES.Divider,
    });

    // in case of hover on header, apply hovering on the whole container
    if (isHeaderBlock(block.type)) {
      const container = document.getElementById(`container-${block.uid}`);
      // Might not be mounted yet
      if (container) {
        container.className = blockClasses;
      }
    }
    // We don't want the container to have the block class
    blockClasses += " block";

    const commentClasses = classnames("block__comment", {
      "block__comment--open": this.commentsOpen,
    });

    return (
      <div ref="blocknode"
         className={blockClasses}
         onMouseMove={this.selectInsertionPos.bind(this)}
         onMouseLeave={this.changeHoverState.bind(this, HoverKind.NONE)}>
          {this.renderActions()}
          <div className="block__content" onMouseEnter={this.changeHoverState.bind(this, HoverKind.CONTENT)}>
            {component}
          </div>
          <div className={commentClasses} onMouseEnter={this.changeHoverState.bind(this, HoverKind.CONTAINERS)}>
            {this.renderComments()}
          </div>
      </div>
    );
  }
}


export default Block;
