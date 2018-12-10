import * as React from "react";
import * as classnames from "classnames";


import { KEY_CODES } from "../../../constants/events";


interface IInlineInputProps extends React.Props<{}> {
  value: string | any;
  onEnter: (value: string) => any;
  // whether inline-input-value takes 100% of the width (cost table)
  // default is min-width: 250px
  fullWidth?: boolean;
  allowEmpty?: boolean;
  inputType?: string;
  placeholder?: string;
  formatValue?: (val: any) => string;
}

interface IInlineInputState {
  editing: boolean;
}

export class InlineInput extends React.Component<IInlineInputProps, IInlineInputState> {
  constructor(props) {
    super(props);
    this.state = {editing: false};
  }

  componentDidUpdate(prevProps, prevState: IInlineInputState) {
    if (!prevState.editing && this.state.editing) {
      const input = this.refs["input"] as HTMLInputElement;
      input.select();
    }
  }

  goIntoEditMode() {
    this.setState({editing: true} as any);
  }

  changeValue() {
    const input = this.refs["input"] as HTMLInputElement;
    const value = input.value.trim();

    if (!this.props.allowEmpty && value === "") {
      this.setState({editing: false} as any);
      return;
    }

    // No need to do anything if we didn't change the value
    if (value === this.props.value) {
      this.setState({editing: false} as any);
      return;
    }

    this.props.onEnter(value);
    this.setState({editing: false} as any);
  }

  // We only care about enter here
  onKeyPress(event: React.KeyboardEvent<any>) {
    if (event.which !== KEY_CODES.Enter) {
      return;
    }
    this.changeValue();
  }

  onKeyDown(event: React.KeyboardEvent<any>) {
    if (event.which === KEY_CODES.Escape) {
      this.setState({editing: false} as any);
      return;
    }
  }

  render() {
    const { value, fullWidth, inputType, formatValue, placeholder } = this.props;
    if (this.state.editing) {
      return (
        <input
          ref="input"
          className="inline-input"
          type={inputType ? inputType : "text"}
          onKeyPress={this.onKeyPress.bind(this)}
          onKeyDown={this.onKeyDown.bind(this)}
          onBlur={this.changeValue.bind(this)}
          defaultValue={value} />
      );
    }


    const valueClasses = classnames("inline-input-value", {
      "inline-input-value--fullwidth": fullWidth,
    });

    let valueDisplay = value;
    if (formatValue) {
      valueDisplay = formatValue(value);
    }
    if (placeholder && value === "") {
      valueDisplay = <span className="inline-input-value--placeholder">{placeholder}</span>;
    }
    return (
      <span
        className={valueClasses}
        onClick={this.goIntoEditMode.bind(this)}>
        {valueDisplay} <span className="icon-edit"/>
      </span>
    );
  }
}

export default InlineInput;
