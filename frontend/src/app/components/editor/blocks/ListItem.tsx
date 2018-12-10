import * as React from "react";
import * as ReactDom from "react-dom";
import { isEqual } from "lodash";


import ContentEditable from "./ContentEditable";
import { extractContentAfterCaret, isCaretAtBeginning } from "../../../utils/selection";
import { TextBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";
import { BLOCK_TYPES } from "../../../constants/blocks";


interface IListItemProps {
  block: TextBlock;
}


export class ListItem extends React.Component<IListItemProps, {}> {
  constructor(props) {
    super(props);
    this.onEnter = this.onEnter.bind(this);
    this.onBackspace = this.onBackspace.bind(this);
  }

  shouldComponentUpdate(nextProps: IListItemProps) {
    return !isEqual(this.props.block, nextProps.block);
  }

  onEnter(event: React.FocusEvent<any>) {
    event.preventDefault();
    const li = ReactDom.findDOMNode(this) as HTMLElement;
    const hasText = li.innerHTML !== "";

    const { uid, type } = this.props.block;
    if (hasText) {
      const content = extractContentAfterCaret();
      // For some reasons, li extract the content correctly but it does not re-trigger
      // a change in the contenteditable so we update it manually.
      // If we don't the extracted content stays in the li
      rootStore.blockStore.updateText(uid, li.innerHTML);
      rootStore.blockStore.addBlock(uid, type, content);
    } else {
      rootStore.blockStore.turnInto(uid, {type: BLOCK_TYPES.Paragraph});
    }
  }

  onBackspace(event: React.KeyboardEvent<any>, isEmpty: boolean) {
    if (isEmpty) {
      event.preventDefault();
      rootStore.blockStore.removeSingleBlock(this.props.block.uid);
      return;
    }

    if (isCaretAtBeginning()) {
      event.preventDefault();
      rootStore.blockStore.turnInto(this.props.block.uid, {type: BLOCK_TYPES.Paragraph});
      return;
    }
  }

  render() {
    const { uid, data, version, proposalId } = this.props.block;
    return (
      <ContentEditable
        id={uid}
        ceKey={`${uid}-${version}-li`}
        proposalId={proposalId}
        tag="li"
        update={(val: string) => rootStore.blockStore.updateText(uid, val)}
        onEnter={this.onEnter}
        onBackspace={this.onBackspace}
        value={data.value || ""}
        placeholder="A list item" />
    );
  }
}

export default ListItem;
