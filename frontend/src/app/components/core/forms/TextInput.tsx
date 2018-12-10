import * as uuid from "uuid";
import * as React from "react";
import * as classnames from "classnames";

import { ERROR_DESCRIPTIONS } from "../../../constants/errors";

interface ITextInputProps extends React.Props<{}> {
  label: string;
  note?: string;
  value: string;
  type: string;
  name: string;
  error?: string | Array<string>;
  onChange?: (value) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

interface ITextInputState {
  input: string;
  active: boolean;
  toggled?: boolean;
}

// A text input, can be type === text | password | email
export class TextInput extends React.Component<ITextInputProps, ITextInputState> {
  id: string;

  constructor(props) {
    super(props);
    this.state = {active: false, toggled: false, input: props.value};
    this.id = uuid.v4();
  }

  componentDidMount() {
    if (this.props.autoFocus) {
      (this.refs["input"] as HTMLInputElement).focus();
    }
  }

  componentDidUpdate() {
    if (this.props.value !== this.state.input) {
      this.setState({input: this.props.value} as any);
    }
  }

  renderError() {
    const error = this.props.error;
    if (!error) {
      return null;
    }

    // Hack for now for server errors. If they are from the server they will
    // be in a array
    return (
      <small className="error-message">
        {typeof error === "string" ? ERROR_DESCRIPTIONS[error] : error[0]}
      </small>
    );
  }

  renderNote() {
    const note = this.props.note;
    if (!note) {
      return null;
    }

    return (
      <small className="note">{note}</small>
    );
  }

  togglePasswordVisibility(event) {
    if (this.props.type === "password") {
      this.setState({toggled: !this.state.toggled} as any);
    }
  }

  renderPasswordVisibilityToggle(type: string, value: string) {
    if (type !== "password") {
      return null;
    }
    const { toggled } = this.state;
    if (value === "") {
      return null;
    }

    if (toggled) {
      return (
        <span onClick={this.togglePasswordVisibility.bind(this)} className="password-visibility align-icons">
          <span className="icon-hide" /> Hide
        </span>
      );
    }

    return (
      <span onClick={this.togglePasswordVisibility.bind(this)} className="password-visibility align-icons">
        <span className="icon-show" /> Show
      </span>
    );
  }

  onChange(event: React.SyntheticEvent<any>) {
    const field = event.target as HTMLInputElement;
    this.setState({input: field.value} as any);

    const onChange = this.props.onChange;
    if (onChange) {
      onChange(field.value);
    }
  }

  render() {
    const {toggled, input} = this.state;
    const { label, type, error, name, disabled } = this.props;
    const classes = classnames("text-input", {
      "text-input--active": this.state.active || input !== "",
      "text-input--error": error !== undefined,
      "text-input--disabled": disabled,
    });

    return (
      <div className={classes}>
        <input
          id={this.id}
          type={toggled ? "text" : type}
          disabled={disabled}
          value={input}
          onFocus={() => this.setState({active: true} as any)}
          onBlur={() => this.setState({active: false} as any)}
          onChange={this.onChange.bind(this)}
          ref="input"
          autoComplete={type === "search" ? "off" : null}
          name={name} />
        <label htmlFor={this.id}>{label}</label>
        {this.renderPasswordVisibilityToggle(type, input)}
        {this.renderNote()}
        {this.renderError()}
      </div>
    );
  }
}

export default TextInput;
