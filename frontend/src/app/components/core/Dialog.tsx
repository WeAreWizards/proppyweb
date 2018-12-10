import * as React from "react";
import * as classnames from "classnames";

import Overlay from "./Overlay";
import { KEY_CODES } from "../../constants/events";


interface IDialogProps extends React.Props<{}> {
  title?: string;
  actions: Array<any>;
  onClose?: any;
}

// Show a modal dialog in the center of the screen with an overlay below
// that makes the background darker
export class Dialog extends React.Component<IDialogProps, {}> {
  constructor(props) {
    super(props);
    this.closeOnEscape = this.closeOnEscape.bind(this);
  }

  renderActions() {
    return this.props.actions.map((action, index) => {
      const classes = classnames("button", {"button--disabled": action.disabled});
      return (
        <button className={classes} key={index} disabled={action.disabled} onClick={action.onClick}>
          {action.label}
        </button>
      );
    });
  }

  componentDidMount() {
    document.body.addEventListener("keydown", this.closeOnEscape);
  }

  componentWillUnmount() {
    document.body.removeEventListener("keydown", this.closeOnEscape);
  }

  closeOnEscape(event: KeyboardEvent) {
    if (event.which === KEY_CODES.Escape) {
      event.preventDefault();
      this.props.onClose();
    }
  }

  render() {
    const { onClose, title, children } = this.props;

    return (
      <Overlay onClick={(event) => event.preventDefault()}>
        <div className="dialog">
          { onClose !== undefined ? <div className="dialog__close" onClick={onClose}><span className="icon-close" /></div> : null }
          <section className="dialog__body">
            {title ? <h2 className="dialog__title">{title}</h2> : null}
            {children}
          </section>
          <nav className="dialog__actions">{this.renderActions()}</nav>
        </div>
      </Overlay>
    );
  }
}


export default Dialog;
