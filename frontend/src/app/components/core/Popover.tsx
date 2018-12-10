import * as React from "react";


interface IPopoverProps extends React.Props<{}> {
  hidden?: boolean;
}

export class Popover extends React.Component<IPopoverProps, {}> {
  render() {
    return (
      <div style={this.props.hidden ? {display: "none"} : null} className="popover prevent-blur popover--bottom">
        <div className="popover__inner">
          {this.props.children}
        </div>
        <div className="popover__arrow-container">
            <span className="popover__arrow" />
        </div>
      </div>
    );
  }
}


export default Popover;
