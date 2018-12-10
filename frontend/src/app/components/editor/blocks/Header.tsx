import * as React from "react";


import ContentEditable from "./ContentEditable";
import { BLOCK_TYPES } from "../../../constants/blocks";
import {
  extractContentAfterCaret,
  isCaretAtBeginning,
} from "../../../utils/selection";

import { TextBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";


interface IHeaderProps {
  block: TextBlock;
}


export class Header extends React.Component<IHeaderProps, {}> {
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
    }
  }

  render() {
    const { type, uid, version, data, proposalId } = this.props.block;

    let placeholder = "";
    let tag = "";
    if (type === BLOCK_TYPES.Section) {
      placeholder = "Heading 1";
      tag = "h2";
    } else if (type === BLOCK_TYPES.Subtitle) {
      placeholder = "Heading 2";
      tag = "h3";
    } else if (type === BLOCK_TYPES.H3) {
      placeholder = "Heading 3";
      tag = "h4";
    }

    return (
      <ContentEditable
        id={uid}
        proposalId={proposalId}
        ceKey={`${uid}-${tag}-${version}`}
        tag={tag}
        update={(val: string) => rootStore.blockStore.updateText(uid, val)}
        onBackspace={this.onBackspace.bind(this)}
        onEnter={this.onEnter.bind(this)}
        value={data.value}
        placeholder={placeholder}/>
    );
  }
}


export default Header;
