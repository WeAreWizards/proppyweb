import * as React from "react";

import Choices from "./Choices";
import { KEY_CODES } from "../../../constants/events";
import { isDescendantOf } from "../../../utils/html";


export type IChoice = {label: string, value: string | number, icon?: string};

interface ISelectProps {
  value?: string | number;
  placeholder?: string;
  options: Array<IChoice>;
  allowCreate: boolean;
  // Remove client if input is empty
  handleRemove?: () => void;
  createFn?: (val: any) => void;
  createMsg?: string;
  onChange: (val: number | string) => void;
  allowSearch: boolean;
  className?: string;
  renderChoice?: (choice: IChoice) => any;
  // if we set the current value as the query (client select)
  valueAsQuery?: boolean;
  // if we set the current value as the placeholder (currency select)
  valueAsPlaceholder?: boolean;
}

interface ISelectState {
  query: string;
  selectedIndex: number;
  options: Array<IChoice>;
  placeholder: string;
  forceDisplay: boolean;
}

// We (currently) have 4 types of select inputs
// - basic one: status select on dashboard
// - tag one: has a placeholder but no values itself
// - currency/font-picker: plain list, can't add a new option and shows current one as placeholder
// - client: can add a new client, shows current one as input value
export class Select extends React.Component<ISelectProps, ISelectState> {
  constructor(props) {
    super(props);

    let selectedIndex = -1;
    let placeholder = "";

    if (props.value !== undefined) {
      // .find() not on IE unfortunately
      props.options.map((option, i) => {
        if (option.value === props.value) {
          selectedIndex = i;
          placeholder = option.label;
        }
      });
    }

    this.state = {
      query: "",
      selectedIndex,
      options: this.filteredChoices("", props.options),
      placeholder: props.value !== undefined ? placeholder : props.placeholder,
      forceDisplay: false,
    };

    this.onDocumentClick = this.onDocumentClick.bind(this);
  }

  onDocumentClick(e: Event) {
    const container = this.refs["select-container"] as HTMLInputElement;
    if (!isDescendantOf(e.target as any, (node) => node === container)) {
      this.setState({forceDisplay: false} as any);
    }
  }

  setValueAsQuery(forceQuery?: string) {
    const { valueAsQuery, options, value } = this.props;
    if (valueAsQuery) {
      let query = "";
      const found = options.filter(option => option.value === value);
      if (found.length > 0) {
        query = found[0].label;
      }
      if (forceQuery !== undefined) {
        query = forceQuery;
      }
      (this.refs["input"] as HTMLInputElement).value = query || "";
    }
  }

  componentDidMount() {
    this.setValueAsQuery();
    if (!this.props.allowSearch) {
      document.addEventListener("click", this.onDocumentClick);
    }
  }

  componentWillUnmount() {
    if (!this.props.allowSearch) {
      document.removeEventListener("click", this.onDocumentClick);
    }
  }

  filteredChoices(query: string, choices: Array<IChoice>) {
    return choices.filter(option => {
      return option.label.toLowerCase().indexOf(query.toLowerCase()) > -1;
    });
  }

  onInputChange() {
    const query = this.getInputValue();
    if (query === "" && this.props.handleRemove) {
      this.props.handleRemove();
      this.reset();
      this.setValueAsQuery("");
      return;
    }

    const options = this.filteredChoices(query, this.props.options);
    let selectedIndex = this.state.selectedIndex;
    if (selectedIndex >= options.length) {
      selectedIndex = options.length - 1;
    } else if (selectedIndex === -1 && options.length > 0) {
      selectedIndex = 0;
    }
    this.setState({query, selectedIndex, options, forceDisplay: false} as any);
  }

  onInputKeyDown(e: React.KeyboardEvent<any>) {
    const { selectedIndex, options } = this.state;

    if (e.which === KEY_CODES.Down) {
      e.preventDefault();
      this.setState({
        selectedIndex: selectedIndex + 1 >= options.length ? 0 : selectedIndex + 1,
      } as any);
    }

    if (e.which === KEY_CODES.Up) {
      e.preventDefault();
      this.setState({
        selectedIndex: selectedIndex - 1 < 0 ? options.length - 1 : selectedIndex - 1,
      } as any);
    }

    if (e.which === KEY_CODES.Escape) {
      e.preventDefault();
      this.reset();
    }

    if (e.which === KEY_CODES.Enter) {
      e.preventDefault();
      this.onChange();
    }
  }

  onInputBlur() {
    this.reset();
  }

  clearInput() {
    const input = this.refs["input"] as HTMLInputElement;
    if (input) {
      input.value = "";
    }
  }

  getInputValue() {
    return (this.refs["input"] as HTMLInputElement).value.trim();
  }

  reset() {
    if (!this.props.valueAsQuery) {
      this.clearInput();
    }
    this.setState({query: "", options: [], selectedIndex: -1, forceDisplay: false} as any);
  }

  // called when creating a new element from a string
  create() {
    if (!this.props.createFn) {
      return;
    }

    const value = this.getInputValue();
    this.props.createFn(value);
    this.reset();
    this.setState({placeholder: value} as any);
  }

  // called on click or on pressing enter
  onChange(value?: string | number, label?: string) {
    if (value !== undefined) {
      this.props.onChange(value);
      this.reset();
      this.setValueAsQuery(label);
      this.setState({placeholder: label} as any);
      return;
    }

    const { selectedIndex, options, query } = this.state;
    if (selectedIndex === -1 && query !== "" && options.length === 0) {
      this.create();
      return;
    }
    const selectedOption = options[selectedIndex];
    if (!selectedOption) {
      return;
    }
    this.props.onChange(selectedOption.value);
    this.reset();
    this.setState({placeholder: selectedOption.label} as any);
    this.setValueAsQuery(selectedOption.label);
  }

  setSelected(index: number) {
    this.setState({selectedIndex: index} as any);
  }

  // Currency select shows the currency as placeholder
  getPlaceholder() {
    if (this.props.valueAsPlaceholder) {
      return this.state.placeholder;
    }
    return this.props.placeholder;
  }

  // on arrow click, force the showing of the choices container
  // on click again hide it
  onArrowClick(e: React.SyntheticEvent<any>) {
    e.preventDefault();
    const input = this.refs["input"] as HTMLInputElement;
    if (input) {
      input.focus();
    }
    this.setState({
      forceDisplay: !this.state.forceDisplay,
      options: this.filteredChoices(this.state.query, this.props.options),
    } as any);
  }

  renderSearchableSelect() {
    const { className, allowCreate, createMsg } = this.props;

    let classes = "proppy-select ";
    if (className) {
      classes += className;
    }
    return (
      <div className={classes} ref="select-container">
        <span className="icon-arrow-down" onMouseDown={this.onArrowClick.bind(this)} />
        <input
          ref="input"
          onChange={this.onInputChange.bind(this)}
          onKeyDown={this.onInputKeyDown.bind(this)}
          onClick={(e: React.MouseEvent<any>) => (e.target as any).select()}
          onBlur={this.onInputBlur.bind(this)}
          placeholder={this.getPlaceholder()}
          aria-label={this.getPlaceholder()}
          type="text"/>

        <Choices
          {...this.state as any}
          setSelected={this.setSelected.bind(this)}
          allowCreate={allowCreate}
          createMsg={createMsg}
          onChoiceClick={this.onChange.bind(this)}
          createFn={this.create.bind(this)} />
      </div>
    );
  }

  renderBasicSelect() {
    const { className, value, renderChoice, options } = this.props;

    let classes = "proppy-select ";
    if (className) {
      classes += className;
    }
    let optionFound = null;
    options.map(option => {
      if (option.value === value) {
        optionFound = option;
      }
    });

    return (
      <div className={classes} ref="select-container">
        <div className="basic-select-choice" onMouseDown={this.onArrowClick.bind(this)}>
          { renderChoice ? renderChoice(optionFound) : optionFound.label}
        </div>
        <span className="icon-arrow-down" onMouseDown={this.onArrowClick.bind(this)} />

        <Choices
          {...this.state as any}
          setSelected={this.setSelected.bind(this)}
          allowCreate={false}
          renderChoice={renderChoice}
          onChoiceClick={this.onChange.bind(this)} />
      </div>
    );
  }

  render() {
    if (this.props.allowSearch) {
      return this.renderSearchableSelect();
    }

    return this.renderBasicSelect();
  }
}


export default Select;
