import * as React from "react";
import * as classnames from "classnames";



interface ISpeechBubbleProps {
  count: number;
  showIfZero: boolean;
  onClick?: any;
  big?: boolean;
}

// A speech bubble with text in it.
// Text needs to be 3 digits or less for now
export class SpeechBubble extends React.Component<ISpeechBubbleProps, {}> {
  onClick(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    if (this.props.onClick) {
      this.props.onClick();
    }
  }

  render() {
    const { count, showIfZero } = this.props;
    const iconClass = count === 0 ? "icon-add-comment" : "icon-bubble-full";

    if (count === 0 && !showIfZero) {
      return null;
    }
    const classes = classnames("speech-bubble prevent-blur", {
        "speech-bubble--big": this.props.big,
    });

    return (
      <span className={classes} onClick={this.onClick.bind(this)}>
        <span className={iconClass} />
        {count > 0 ? count : null}
      </span>
    );
  }
}


export default SpeechBubble;
