import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { isEqual } from "lodash";


import ContentEditable from "./ContentEditable";
import { extractContentAfterCaret, isCaretAtBeginning, setCaretAtEnd } from "../../../utils/selection";
import { removeBr } from "../../../utils/html";
import { BLOCK_TYPES } from "../../../constants/blocks";

import { TextBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";


interface IParagraphProps {
  block: TextBlock;
}


@observer
export class Paragraph extends React.Component<IParagraphProps, {}> {
  @observable showPlus = false;

  constructor(props) {
    super(props);
    this.onEnter = this.onEnter.bind(this);
    this.onBackspace = this.onBackspace.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  shouldComponentUpdate(nextProps: IParagraphProps) {
    return !isEqual(this.props.block, nextProps.block);
  }

  componentDidUpdate() {
    // So we check the HTML directly as currently the props might be lying about
    // the current value. Ie typing '/' and then deleting it, the data in the props
    // might still be '/'.
    // Painful
    const ce = document.getElementById(this.props.block.uid) as HTMLElement;
    if (ce.innerText === "/") {
      setCaretAtEnd(ce);
      return;
    }
    // Firefox adds random br when setting the caret which causes the caret to go back
    // to the beginning after typing the first char in a paragraph (after re-rendering to
    // remove the green plus). This is a hack that ensures we do really focus at the end
    if (!this.showPlus && this.props.block.uid === rootStore.editorStore.focusedBlockUid && ce.innerText.length > 0) {
      setCaretAtEnd(ce);
    }
  }

  onChange(value) {
    const val = removeBr(value);
    const open = value !== undefined && val.length === 0;
    if (this.showPlus !== open) {
      this.showPlus = open;
    }

    // Don't overlap actions and the green plus
    if (this.showPlus) {
      rootStore.uiStore.resetHovering();
    }
  }

  onBlur(event: React.FocusEvent<any>) {
    this.showPlus = false;
  }

  onEnter(event: React.FocusEvent<any>) {
    event.preventDefault();
    const content = extractContentAfterCaret();
    rootStore.blockStore.addBlock(this.props.block.uid, BLOCK_TYPES.Paragraph, content);
  }

  onBackspace(event: React.KeyboardEvent<any>, isEmpty: boolean) {
    if (isEmpty) {
      event.preventDefault();
      rootStore.blockStore.removeSingleBlock(this.props.block.uid);
    }

    if (isCaretAtBeginning()) {
      event.preventDefault();
      rootStore.blockStore.mergeWithPrevious(this.props.block.uid);
      return;
    }
  }

  onToggleClick(event: React.MouseEvent<any>) {
    event.preventDefault();
    // The timeout is there to give a sense of transition and be too abrupt.
    // No technical reason
    setTimeout(() => {
      rootStore.blockStore.updateText(this.props.block.uid, "/");
      this.onChange("/");
      this.forceUpdate();
    }, 100);
  }

  renderInput() {
    const { uid, proposalId, data, version } = this.props.block;

    return (
      <ContentEditable
        id={uid}
        ceKey={`${uid}-${version}-paragraph`}
        proposalId={proposalId}
        tag="p"
        update={(val: string) => rootStore.blockStore.updateText(uid, val)}
        onEnter={this.onEnter}
        onBackspace={this.onBackspace}
        onBlur={this.onBlur}
        onEmitChange={this.onChange.bind(this)}
        value={data.value || ""}
        placeholder="..." />
    );
  }

  renderPlus() {
    if (!this.showPlus) {
      return null;
    }

    return (
      <div className="block-changer-toggle">
        <span onMouseDown={this.onToggleClick.bind(this)} className="icon-add"/>
      </div>
    );
  }

  render() {
    return (
      <div>
        {this.renderPlus()}
        {this.renderInput()}
      </div>
    );
  }
}


export default Paragraph;
