import * as React from "react";

import { IChoice } from "./Select";

interface IChoicesProps {
  options: Array<IChoice>;
  selectedIndex: number;
  setSelected: (index: number) => void;
  query: string;
  allowCreate: boolean;
  forceDisplay: boolean;
  onChoiceClick: (val: number | string, label: string) => void;
  renderChoice?: (choice: IChoice) => any;
  createFn?: () => void;
  createMsg?: string;
}

export class Choices extends React.Component<IChoicesProps, {}> {
  scrollIfNecessary() {
    const container = this.refs["container"] as HTMLDivElement;
    if (!container) {
      return;
    }
    const node = container.querySelector(".option--active") as HTMLElement;
    if (!node) {
      return;
    }

    const containerHeight = container.offsetHeight;
    const nodeHeight = node.offsetHeight;
    const relativeChoiceTop = node.offsetTop - container.scrollTop;

    if (relativeChoiceTop + nodeHeight > containerHeight) {
      container.scrollTop += (relativeChoiceTop - containerHeight) + nodeHeight;
      return;
    }
    if (relativeChoiceTop < 0) {
      container.scrollTop += relativeChoiceTop;
    }
  }

  componentDidMount() {
    this.scrollIfNecessary();
  }

  componentDidUpdate(prevProps: IChoicesProps) {
    if (this.props.forceDisplay || prevProps.selectedIndex !== this.props.selectedIndex) {
      this.scrollIfNecessary();
    }
  }

  onChoiceClick(value: any, label: string, e: React.SyntheticEvent<any>) {
    e.preventDefault();
    this.props.onChoiceClick(value, label);
  }

  render() {
    const {
      options, selectedIndex, allowCreate, query, createFn, setSelected, createMsg,
      forceDisplay, renderChoice,
    } = this.props;

    if (query === "" && !forceDisplay || forceDisplay && options.length === 0) {
      return null;
    }

    if (options.length === 0 && !allowCreate) {
      return null;
    }

    let choices = options.map((option, i) => {
      let content = <span dangerouslySetInnerHTML={{__html: option.label}} />;
      if (renderChoice) {
        content = renderChoice(option);
      }
      return (
        <li key={i}
            onMouseOver={setSelected.bind(null, i)}
            onMouseDown={this.onChoiceClick.bind(this, option.value, option.label)}
            className={i === selectedIndex ? "option--active" : ""}>
          {content}
        </li>
      );
    });

    if (options.length === 0) {
      choices = [(
        <li key="add" onMouseDown={createFn} className="option--active">
          <span>{createMsg.replace("{label}", query)}</span>
        </li>
      )];
    }


    return (
      <div className="proppy-select__options" ref="container">
        <ul>
          {choices}
        </ul>
      </div>
    );
  }
}


export default Choices;
