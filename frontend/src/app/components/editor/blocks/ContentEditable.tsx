import * as React from "react";
import * as ReactDom from "react-dom";

import { KEY_CODES } from "../../../constants/events";
import {
  isTextNodeEmpty, removeBr, unescape, stripTags,
} from "../../../utils/html";
import { pasteHTML } from "../../../utils/pasting";
import { getLineIndexPos } from "../../../utils/selection";

import rootStore from "../../../stores/RootStore";


interface IContentEditableProps {
  id: string;
  proposalId: number;
  ceKey?: any;
  tag: string;
  value: string;
  placeholder: string;
  update: (value: string) => void;
  onEnter: (event: React.SyntheticEvent<any>) => void;
  onBackspace?: (event: React.SyntheticEvent<any>, isEmpty: boolean) => void;
  onDelete?: (event: React.SyntheticEvent<any>) => void;
  onBlur?: (event: React.FocusEvent<any>) => void;
  onEmitChange?: (value: string) => void;
}


// Titles can never contain HTML
const NO_HTML_PASTE_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

// See http://stackoverflow.com/a/27255103/82609
export class ContentEditable extends React.Component<IContentEditableProps, {}> {
  /* tslint:disable:no-empty */
  static defaultProps = {
    onBackspace: () => {},
    onDelete: () => {},
    onFocus: () => {},
    onBlur: () => {},
  };
  /* tslint:enable:no-empty */
  lastHTML: string;

  constructor(props) {
    super(props);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.lastHTML = props.value;
  }

  shouldComponentUpdate(nextProps: IContentEditableProps) {
    // Only exception for CE is the title as it doesn't have its own block
    // with contenteditable
    // Proposal title is the only exception to shouldComponentUpdate as other
    // blocks handle their updates themsel
    if (this.props.tag === "h1") {
      if (nextProps.value === unescape(removeBr(this.getCurrentHTML())).trim()) {
        return false;
      }
    }
    return true;
  }

  // Header have some special characteristic, ie no shortcuts allowed
  isHeader() {
    return ["h1", "h2", "h3"].indexOf(this.props.tag) > -1;
  }

  getCurrentHTML() {
    const node = ReactDom.findDOMNode(this) as HTMLElement;
    return node.innerHTML;
  }

  getCurrentInnerText() {
    const node = ReactDom.findDOMNode(this) as HTMLElement;
    return node.innerText;
  }

  onKeyUp() {
    // See #184: syncing on keyDown is one action behind so we need to
    // also sync on key up. I profiled this and emitChange is very
    // fast on Chrome and Firefox (didn't show up anywhere at the top
    // of the profile).
    this.emitChange();
  }

  componentDidMount() {
    const node = ReactDom.findDOMNode(this) as HTMLElement;
    // Firefox adds empty br to some contenteditable so we
    // strip them to show the placeholder
    if (removeBr(node.innerHTML) === "") {
      node.innerHTML = "";
    }
  }

  hasInlineBlockChanger() {
    return this.props.tag === "p"
        && rootStore.editorStore.blockChanger && rootStore.editorStore.blockChanger.uid === this.props.id
        // we could have a filter that gives no result and in that case we
        // want Enter to have the normal behaviour, not to be cancelled
        && document.getElementById("block-changer-unique");
  }

  onKeyDown(event: React.KeyboardEvent<any>) {
    if (!this.hasInlineBlockChanger() && event.which === KEY_CODES.Enter && !event.shiftKey) {
      this.props.onEnter(event);
      return;
    }

    // we might have failed to get a range for some reasons
    const lineIndexPos = getLineIndexPos();
    let [lineIx, nLines, left] = [0, 0, 0];
    if (lineIndexPos !== null) {
      [lineIx, nLines, left] = lineIndexPos;
    }
    if (lineIndexPos !== null && !this.hasInlineBlockChanger() && event.which === KEY_CODES.Down && lineIx + 1 === nLines) {
      rootStore.blockStore.focusNext(left);
      event.preventDefault();
    }
    if (lineIndexPos !== null && !this.hasInlineBlockChanger() && event.which === KEY_CODES.Up && lineIx === 0) {
      rootStore.blockStore.focusPrevious(left);
      event.preventDefault();
    }

    if (event.which === KEY_CODES.Backspace) {
      // We usually want to know whether the node is empty or not.

      // Some operations on blocks (e.g. merging) operate on the store
      // content so we need to make sure the content of this element
      // is in the store before handling backspace.
      this.emitChange();
      this.props.onBackspace(event, isTextNodeEmpty(event.target));
      return;
    }

    // Almost the same as Backspace except we don't delete the block
    if (event.which === KEY_CODES.Delete) {
      this.props.onDelete(event);
      return;
    }

    // And now let's have a look for shortcuts
    const isControlPressed = event.metaKey || event.ctrlKey;
    if (!isControlPressed) {
      return;
    }

    switch (event.which) {
      case KEY_CODES.B:
        event.preventDefault();
        if (!this.isHeader()) {
          document.execCommand("bold", false, null);
        }
        break;
      case KEY_CODES.I:
        event.preventDefault();
        if (!this.isHeader()) {
          document.execCommand("italic", false, null);
        }
        break;
      case KEY_CODES.U:
        event.preventDefault();
        break;
      default:
        return;
    }
  }

  // Used by the Paragraph to know if it needs to render the block changer
  onFocus() {
    this.emitChange();
    rootStore.editorStore.setFocusedBlock(this.props.id);
  }

  onBlur(event: React.FocusEvent<any>) {
    this.emitChange();
    this.props.onBlur(event);
  }

  onInput() {
    // spellcheck only triggers a input event so we need to emit that
    // change otherwise it won't be saved
    this.emitChange();
  }

  emitChange() {
    const html = this.getCurrentHTML();
    let cleanedHTML = html;

    // always remove all kind of <br> on titles
    if (this.props.tag === "h1") {
      // h1 are rendered in mails etc so we want them to be ok all the time
      // chrome seems to trim the h1, so trimming manually to have the same behaviour
      cleanedHTML = unescape(removeBr(cleanedHTML)).trim();
    }

    // Firefox will keep adding empty <br> to empty CE so trim them all to avoid
    // all kind of issues
    if (this.getCurrentInnerText().trim().length === 0) {
      cleanedHTML = removeBr(cleanedHTML);
    }

    const needsUpdate = cleanedHTML !== this.lastHTML;
    this.lastHTML = cleanedHTML;
    if (needsUpdate) {
      this.props.update(cleanedHTML);
    }

    if (this.props.onEmitChange) {
      this.props.onEmitChange(cleanedHTML);
    }
  }

  handlePasting(event: React.ClipboardEvent<any>) {
    event.preventDefault();
    const { tag, id } = this.props;
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    // If it's plain text, just insert it directly
    if (html === "" && text !== "") {
      document.execCommand("insertText", false, text);
      return;
    }

    // We disallow html in some tag cases so if the target is one of these,
    // just paste the text
    if (NO_HTML_PASTE_TAGS.indexOf((event.target as HTMLElement).tagName.toLowerCase()) > -1) {
      document.execCommand("insertHTML", false, stripTags(text));
      return;
    }

    const currentHTML = this.getCurrentHTML();
    const result = pasteHTML(html, tag, currentHTML);

    if (result === null) {
      return;
    }

    rootStore.blockStore.batchAdd(id, result.blocks, result.replaceCurrent);
  }

  cancelDrop(event: React.SyntheticEvent<any>) {
    event.preventDefault();
  }

  render() {
    const Tag: any = this.props.tag;
    const { id, value, ceKey, placeholder } = this.props;

    return (
      <Tag
        contentEditable
        spellCheck="true"
        id={id}
        name={id}
        key={ceKey}
        onInput={this.onInput.bind(this)}
        onDrop={this.cancelDrop}
        onDragOver={this.cancelDrop}
        onPaste={this.handlePasting.bind(this)}
        onBlur={this.onBlur.bind(this)}
        onFocus={this.onFocus.bind(this)}
        onKeyDown={this.onKeyDown}
        onKeyUp={this.onKeyUp.bind(this)}
        placeholder={placeholder}
        dangerouslySetInnerHTML={{__html: value}} />
    );
  }
}

export default ContentEditable;
