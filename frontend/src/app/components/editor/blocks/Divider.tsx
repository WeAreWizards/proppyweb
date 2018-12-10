import * as React from "react";

import { DividerBlock } from "../../../stores/models/Block";


interface IDividerProps {
  block: DividerBlock;
}

export class Divider extends React.Component<IDividerProps, {}> {
  render() {
    // We need the outer div for a hover area - otherwise the user
    // needs to hover exactly on a razor-thin hr to get the
    // delete/move buttons on the left side.
    return (
      <div className="proposal-divider" id={this.props.block.uid}>
        <hr />
      </div>
    );
  }
}

export default Divider;
