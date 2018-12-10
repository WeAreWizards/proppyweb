import * as uuid from "uuid";
import * as React from "react";
import * as classnames from "classnames";

import { ERROR_DESCRIPTIONS } from "../../../constants/errors";

interface ITextAreaProps extends React.Props<{}> {
  label: string;
  note?: string;
  value: string;
  name: string;
  rows: number;
  canResize: boolean;
  error?: string | Array<string>;
  disabled?: boolean;
  onChange?: (val: string) => void;
}

interface ITextAreaState {
  active: boolean;
  toggled?: boolean;
}

// A textarea, almost copy/paste of TextInput.tsx
export class TextArea extends React.Component<ITextAreaProps, ITextAreaState> {
  constructor(props) {
    super(props);
    this.state = {active: false, toggled: false};
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


  render() {
    const { label, value, error, name, disabled, rows, canResize, onChange } = this.props;
    const id = uuid.v4();
    const classes = classnames(
      "text-input",
      {"text-input--active": this.state.active || value !== ""},
      {"text-input--error": error !== undefined},
    );

    let style = {};
    if (!canResize) {
      style = {resize: "none"};
    }

    return (
      <div className={classes}>
        <textarea
          id={id}
          style={style}
          disabled={disabled}
          rows={rows}
          defaultValue={value}
          onFocus={() => this.setState({active: true})}
          onBlur={() => this.setState({active: false})}
          onChange={onChange ? (e: any) => onChange(e.target.value) : null}
          name={name} />
        <label htmlFor={id}>{label}</label>
        {this.renderNote()}
        {this.renderError()}
      </div>
    );
  }
}

export default TextArea;
