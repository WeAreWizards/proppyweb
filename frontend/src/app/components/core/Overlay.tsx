import * as React from "react";
import * as ReactDOM from "react-dom";



interface IOverlayProps extends React.Props<{}> {
  onClick?: (event: React.MouseEvent<any>) => void;
}

// Add an overlay on the whole page, useful for things like showing a dialog
export class Overlay extends React.Component<IOverlayProps, {}> {
  node: HTMLElement;

  componentDidMount() {
    this.node = document.createElement("div");
    document.body.appendChild(this.node);
    this.handleRender();
    document.body.style.overflow = "hidden";
  }

  componentDidUpdate() {
    this.handleRender();
  }

  componentWillUnmount() {
    ReactDOM.unmountComponentAtNode(this.node);
    document.body.removeChild(this.node);
    document.body.style.overflow = "visible";
  }

  handleRender() {
    ReactDOM.render(
      <div className="overlay-container">
        <div className="overlay" onClick={this.props.onClick}></div>
        {this.props.children}
      </div>
    , this.node);
  }

  render() {
    return null;
  }
}


export default Overlay;
