import * as React from "react";
import * as ReactDOM from "react-dom";
import { observer } from "mobx-react";
import { observable, action } from "mobx";


import Popover from "../../core/Popover";
import { KEY_CODES } from "../../../constants/events";
import { BLOCK_TYPES } from "../../../constants/blocks";
import {
  getSelectionRange,
  setSelectionRange,
  getSelectionContainer,
} from "../../../utils/selection";
import {
  getRelatedTarget,
  isDescendantOfClass,
  isDescendantOfTag,
  getParentLinkTag,
} from "../../../utils/html";

import rootStore from "../../../stores/RootStore";



// Offers bold, italic and link/unlink on current selection
// Also shows the current link when on a link with a collapsed selection range
@observer
class WysiwygToolbar extends React.Component<{}, {}> {
  @observable show = false;
  @observable showingForm = false;
  // We need a reference to the range for when we want to add a url
  @observable range: Range | null = null;
  @observable target: HTMLElement | null = null;
  @observable hrefNode: HTMLLinkElement | null = null;

  constructor(props) {
    super(props);
    this.fixedMouseUp = this.fixedMouseUp.bind(this);
    this.resetState = this.resetState.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  // This is called on blur OR voluntarily on mouse up.
  // If it's called on blur, we have an event and need to check whether
  // the event target is nested in a block we want to prevent blur from, ie
  // focusing on url input for example
  resetState(event?) {
    getRelatedTarget(event, (eventTarget) => {
      if (eventTarget && isDescendantOfClass(eventTarget, "prevent-blur")) {
        event.preventDefault();
        return;
      }

      if (this.target) {
        this.target.removeEventListener("blur", this.resetState, false);
      }
      if (this.show) {
        const resetWysiwyg = action(() => {
          this.show = false;
          this.showingForm = false;
          this.range = null;
          this.hrefNode = null;
          this.target = null;
        });
        resetWysiwyg();
      }
    });
  }

  // We also need to check the event target on a mouse up for the same reasons
  // as stated on resetState above
  handleMouseUp(event) {
    if (isDescendantOfClass(event.target, "prevent-blur")) {
      event.preventDefault();
      return;
    }

    const range = getSelectionRange();
    if (!range) {
      this.resetState();
      return;
    }

    const target = getSelectionContainer(range) as HTMLElement;
    if (target === null || ["H1"].indexOf(target.tagName) > -1) {
      this.resetState();
      return;
    }

    // Now we need to check if the cursor is collapsed on a link node
    const focusNode = document.getSelection().focusNode;
    const isInLink = isDescendantOfTag(focusNode, ["a"]);
    let hrefNode = null;
    if (range.collapsed || range.toString().trim() === "") {
      // don't forget to reset state if range collapsed outside of a link node
      if (!isInLink) {
        this.resetState();
        return;
      }
      hrefNode = getParentLinkTag(focusNode);
    }

    if (this.target) {
      this.target.removeEventListener("blur", this.resetState, false);
    }

    const showWysiwyg = action(() => {
      this.range = range;
      this.show = true;
      this.target = target;
      this.showingForm = false;
      this.hrefNode = hrefNode;
    });
    showWysiwyg();

    this._positionToolbar();
    target.addEventListener("blur", this.resetState, false);
  }

  // If we start typing outside of the link input, hide it
  handleKeyDown(event: KeyboardEvent) {
    // ctrl+a or cmd+a on mac
    if (event.which === KEY_CODES.A && (event.ctrlKey || event.metaKey)) {
      // Do the same as if we just did a mouseup. The timeout it there to prevent
      // calling the function before the selection range gets updated
      setTimeout(this.handleMouseUp.bind(this, event), 1);
    }

    if (this.target === null || isDescendantOfClass(event.target as any, "prevent-blur")) {
      return;
    }

    this.resetState();
  }

  // There is a bug where clicking in a selection would not update
  // the range. Setting a timeout of 1 fixes it
  fixedMouseUp(event: MouseEvent) {
    setTimeout(this.handleMouseUp.bind(this, event), 1);
  }

  componentDidMount() {
    document.addEventListener("mouseup", this.fixedMouseUp, false);
    document.addEventListener("keydown", this.handleKeyDown, false);
  }

  componentWillUnmount() {
    // Unbind reset state because it will be invoked after unmount
    // this component because we're using a setTimeout causing an error with
    // setState on un unmounted component
    this.resetState = () => { /* noop */};

    // Cleanup after ourselves
    document.removeEventListener("mouseup", this.fixedMouseUp, false);
    document.removeEventListener("keydown", this.handleKeyDown, false);
  }

  componentDidUpdate() {
    if (this.showingForm) {
      (this.refs["linkInput"] as HTMLInputElement).focus();
    }
  }

  // This sets the toolbar at the optimal location based on its height/width
  // and the current location. IE if there is no space in the window to be displayed
  // above, it will be displayed below.
  _positionToolbar() {
    const { range, hrefNode } = this;
    const node = ReactDOM.findDOMNode(this) as HTMLElement;
    let boundary = range.getBoundingClientRect();
    if (hrefNode !== null) {
      boundary = hrefNode.getBoundingClientRect();
    }
    const middleOfBoundary = (boundary.left + boundary.right) / 2;

    const middleOfToolbar = node.offsetWidth / 2;
    const toolbarHeight = node.offsetHeight;

    // diffTop represents how many pixels above/below the selection the toolbar is
    const diffTop = 10;
    let top = window.pageYOffset;
    // If there's no space for the toolbar above, we chuck it below
    if (boundary.top < (toolbarHeight + diffTop)) {
      top += boundary.bottom + diffTop;
    } else {
      // Not entirely why the -70 needs to be there but it needs to
      top += boundary.top - toolbarHeight - diffTop - 70;
    }

    // Now onto the X axis, same thing
    let left = 0;
    if (middleOfBoundary > middleOfToolbar) {
      left = middleOfBoundary - middleOfToolbar;
    }

    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
  }

  bolden(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    document.execCommand("bold", false, null);
    // force re-renders to display the new state of bold button
    this.forceUpdate();
  }

  italicize(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    document.execCommand("italic", false, null);
    // force re-renders to display the new state of italic button
    this.forceUpdate();
  }

  turnIntoH1(isActive: boolean, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const type = isActive ? BLOCK_TYPES.Paragraph : BLOCK_TYPES.Section;
    rootStore.blockStore.turnInto(this.target.id, {type});
    this.resetState();
  }

  turnIntoH2(isActive: boolean, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const type = isActive ? BLOCK_TYPES.Paragraph : BLOCK_TYPES.Subtitle;
    rootStore.blockStore.turnInto(this.target.id, {type});
    this.resetState();
  }

  turnIntoH3(isActive: boolean, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const type = isActive ? BLOCK_TYPES.Paragraph : BLOCK_TYPES.H3;
    rootStore.blockStore.turnInto(this.target.id, {type});
    this.resetState();
  }

  turnIntoOL(isActive: boolean, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const type = isActive ? BLOCK_TYPES.Paragraph : BLOCK_TYPES.OrderedItem;
    rootStore.blockStore.turnInto(this.target.id, {type});
    this.resetState();
  }

  turnIntoUL(isActive: boolean, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const type = isActive ? BLOCK_TYPES.Paragraph : BLOCK_TYPES.UnorderedItem;
    rootStore.blockStore.turnInto(this.target.id, {type});
    this.resetState();
  }

  // Either called from the button or pressing Enter.
  addLink(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const input = this.refs["linkInput"] as HTMLInputElement;
    const range = this.range;

    // TODO: Temporary fudge see #34 on github
    if (range.collapsed) {
      this.resetState();
      return;
    }

    // Only try to add the link if the input is not empty
    if (input.value.trim().length > 1) {
      setSelectionRange(range);
      document.execCommand("createLink", false, input.value.trim());
      // Collapsing the range at the end of the selection
      range.collapse(false);
      setSelectionRange(range);
      input.value = "";
      this.resetState();
    } else {
      input.focus();
    }
  }

  toggleURLForm(hasLink: boolean, event: React.MouseEvent<any>) {
    event.preventDefault();
    // If we have a link just unlink it and don't open anything
    if (hasLink) {
      document.execCommand("unlink", false);
      // force re-renders to display the new state of link button
      this.forceUpdate();
      return;
    }

    // If we are going to hide the form, hide everything as well
    if (this.showingForm === true) {
      this.resetState();
      // this.setState({showingForm: false, show: false} as any);
      return;
    }
    this.showingForm = true;
  }

  render() {
    const { show, showingForm, hrefNode } = this;
    if (!show) {
      return null;
    }

    // First the href value case
    if (hrefNode != null) {
      return (
        <Popover>
          <a href={hrefNode.href} target="_blank">{hrefNode.href}</a>
        </Popover>
      );
    }

    let content = null;

    if (!showingForm) {
      const focusedNode = document.getSelection().focusNode;
      const isBold = isDescendantOfTag(focusedNode, ["strong", "b"]) || document.queryCommandState("bold");
      const isItalic = isDescendantOfTag(focusedNode, ["i", "em"]) || document.queryCommandState("italic");
      const hasLink = isDescendantOfTag(focusedNode, ["a"]);

      // Our logical-user-facing name is H1, H2, but the tags are h2 and h3:
      const isH1 = this.target.tagName === "H2";
      const isH2 = this.target.tagName === "H3";
      const isH3 = this.target.tagName === "H4"; // TODO mismatch between html and internal naming
      const isOL = this.target.tagName === "LI" && isDescendantOfTag(this.target, ["ol"]);
      const isUL = this.target.tagName === "LI" && isDescendantOfTag(this.target, ["ul"]);
      const isQuote = isDescendantOfTag(this.target, ["blockquote"]);

      const styleContent = [
        <button key="bold" className={isBold ? "is-active" : ""} onMouseDown={this.bolden.bind(this)}>
          <span className="icon-bold"/>
        </button>,
        <button key="italic" className={isItalic ? "is-active" : ""} onMouseDown={this.italicize.bind(this)}>
          <span className="icon-italic"/>
        </button>,
        <button key="link" className={hasLink ? "is-active" : ""} onMouseDown={this.toggleURLForm.bind(this, hasLink)}>
          <span className="icon-link"/>
        </button>,
      ];

      const blockContent = [
        <button key="h1" className={isH1 ? "is-active" : ""} onMouseDown={this.turnIntoH1.bind(this, isH1)}>
          <span className="icon-h1"/>
        </button>,
        <button key="h2" className={isH2 ? "is-active" : ""} onMouseDown={this.turnIntoH2.bind(this, isH2)}>
          <span className="icon-h2"/>
        </button>,
        <button key="h3" className={isH3 ? "is-active" : ""} onMouseDown={this.turnIntoH3.bind(this, isH3)}>
          <span className="icon-h3"/>
        </button>,
        <button key="ol" className={isOL ? "is-active" : ""} onMouseDown={this.turnIntoOL.bind(this, isOL)}>
          <span className="icon-ol"/>
        </button>,
        <button key="ul" className={isUL ? "is-active" : ""} onMouseDown={this.turnIntoUL.bind(this, isUL)}>
          <span className="icon-ul"/>
        </button>,
      ];

      content = (
        <div className="toolbar-buttons">
          {isH1 || isH2 || isH3 ? [] : styleContent }
          {isH1 || isH2 || isH3 || isQuote ? null : <span className="separator" key="sep1" />}
          {isQuote ? [] : blockContent}
        </div>
      );
    } else {
      content = (
        <div className="toolbar-link">
          <form ref="linkForm" onSubmit={this.addLink.bind(this)}>
            <input ref="linkInput" type= "text" placeholder="Paste or type a link"/>
          </form>
          <button onMouseDown={this.toggleURLForm.bind(this, false)}>✗</button>
          <button onMouseDown={this.addLink.bind(this)}>✓</button>
        </div>
      );
    }

    return (
      <Popover>
        {content}
      </Popover>
    );
  }
}

export default WysiwygToolbar;
