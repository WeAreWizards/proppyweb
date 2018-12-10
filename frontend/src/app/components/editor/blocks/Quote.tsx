import * as React from "react";


import ContentEditable from "./ContentEditable";
import { BLOCK_TYPES } from "../../../constants/blocks";
import { QuoteBlock } from "../../../stores/models/Block";

import rootStore from "../../../stores/RootStore";


interface IQuoteProps {
  block: QuoteBlock;
}

export class Quote extends React.Component<IQuoteProps, {}> {
  onAuthorEnter(event: React.FocusEvent<any>) {
    event.preventDefault();
    rootStore.blockStore.addBlock(this.props.block.uid, BLOCK_TYPES.Paragraph);
  }

  render() {
    const { uid, data, proposalId } = this.props.block;

    return (
      <blockquote>
        <span className="icon-quotes-right" />
        <ContentEditable
          id={uid}
          proposalId={proposalId}
          tag="p"
          update={(val) => rootStore.blockStore.updateQuote(uid, val, data.source)}
          onEnter={() => {/*no op*/}}
          value={data.quote || ""}
          placeholder="Quote"/>

        <ContentEditable
          id={uid + "-footer"}
          proposalId={proposalId}
          tag="footer"
          update={(val) => rootStore.blockStore.updateQuote(uid, data.quote, val)}
          onEnter={this.onAuthorEnter.bind(this)}
          value={data.source || data.caption || ""}
          placeholder="Source (optional)"/>
      </blockquote>
    );
  }
}


export default Quote;
