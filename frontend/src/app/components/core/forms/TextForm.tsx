import * as React from "react";
import * as classnames from "classnames";


import TextInput from "./TextInput";
import CurrencySelect from "../CurrencySelect";
import { getCurrencyCode } from "../../../utils/currencies";
import { PASSWORD_TOO_SHORT, REQUIRED_FIELD } from "../../../constants/errors";


interface ITextFormProps extends React.Props<{}> {
  inputs: any;
  errors?: any;
  onSubmit: (state: object) => void;
  onChange?: (state: object) => void;
  submitText: string;
  disabledForSubmit?: boolean;
  disabled?: boolean;
  inline?: boolean;
}

// For forms that only contain text fields (ie signup, login etc)
// State is dynamic (ie an object with keys as field name) so just using any for now
export class TextForm extends React.Component<ITextFormProps, any> {
  state: any;

  constructor(props: ITextFormProps) {
    super(props);
    this.state = {errors: {}};

    // Set initial values
    Object.keys(props.inputs).map(name => {
      const input = props.inputs[name];
      if (input.initial !== undefined) {
        this.state[name] = input.initial;
      }
    });
    this.onSubmit = this.onSubmit.bind(this);
    this.onFieldChanged = this.onFieldChanged.bind(this);
  }

  onFieldChanged(event: React.SyntheticEvent<any>) {
    const target = event.target as HTMLInputElement;
    this.setState({[target.name]: target.value});
    if (this.props.onChange) {
      // setState is async so we need to duplicate the state
      // before sending it to onChange or we won't have the latest value
      const newState = this.state;
      newState[target.name] = target.value;
      this.props.onChange(newState);
    }
  }

  onSubmit(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    if (this.isValid()) {
      this.props.onSubmit(this.state);
    }
  }

  onSelectValueChanged(fieldName: string, value: string) {
    this.setState({[fieldName]: value});
  }

  isValid() {
    const errors = {};

    Object.keys(this.props.inputs).map(name => {
      const input = this.props.inputs[name];
      const value = this.state[name];

      if (!value) {
        errors[name] = REQUIRED_FIELD;
        return;
      }

      if (input.minLength !== undefined && value !== "" && value.length < input.minLength) {
        errors[name] = PASSWORD_TOO_SHORT;
      }
    });

    this.setState({errors});
    return Object.keys(errors).length > 0 === false;
  }

  renderInputs() {
    const inputs = [];
    const errors = this.props.errors || this.state.errors;

    Object.keys(this.props.inputs).map(name => {
      const input = this.props.inputs[name];
      if (input.type === "currency-select") {
        inputs.push(
          <div className="currency-input" key={name}>
            <label>Currency</label>
            <CurrencySelect
              currentCurrency={getCurrencyCode(this.state[name] || input.initial)}
              onChange={this.onSelectValueChanged.bind(this, name)} />
          </div>,
        );
        return;
      }

      inputs.push(
        <TextInput
          key={name}
          label={input.label}
          type={input.type}
          note={input.note}
          value={this.state[name] || ""}
          disabled={this.props.disabledForSubmit}
          error={errors[name]}
          name={name} />,
      );
    });

    return inputs;
  }

  render() {
    const {disabledForSubmit, inline, submitText, disabled} = this.props;
    const buttonClasses = classnames("button", {
      "button--disabled": disabledForSubmit || disabled,
    });

    return (
      <form className={inline ? "form--inline" : null} onSubmit={this.onSubmit} onChange={this.onFieldChanged}>
        {this.renderInputs()}
        <button type="submit" disabled={disabledForSubmit} className={buttonClasses}>
          {submitText}
        </button>
      </form>
    );
  }
}


export default TextForm;
