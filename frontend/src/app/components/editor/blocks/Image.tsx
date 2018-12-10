import * as React from "react";


import ContentEditable from "./ContentEditable";
import { BLOCK_TYPES } from "../../../constants/blocks";
import { ImageBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";


interface IImageProps {
  block: ImageBlock;
}


export class Image extends React.Component<IImageProps, {}> {
  onEnter(event: React.FocusEvent<any>) {
    event.preventDefault();
    rootStore.blockStore.addBlock(this.props.block.uid, BLOCK_TYPES.Paragraph);
  }

  render() {
    const { uid, proposalId, data } = this.props.block;

    // TODO
    // Still lots missing: no menu, no styling etc
    return (
      <div>
        <figure>
          <img src={data.url || ""} alt="A proposal image" />
          <ContentEditable
            id={uid}
            proposalId={proposalId}
            tag="figcaption"
            onEnter={this.onEnter.bind(this)}
            update={(val: string) => rootStore.blockStore.updateText(uid, val, true)}
            value={data.caption || ""}
            placeholder="A caption (optional)" />
        </figure>
      </div>
    );
  }
}


export default Image;
