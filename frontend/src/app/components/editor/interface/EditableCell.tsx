import * as React from "react";
import TextareaAutosize from "react-autosize-textarea";

export enum CellType {
  Text,
  Number,
}

interface IEditableCellProps {
  value: any;
  type: CellType;
  updateCell: (value: any) => void;
  key?: number;
}


export class EditableCell extends React.Component<IEditableCellProps, {}> {
  handleInput(event: React.FocusEvent<any>) {
    const input = event.target as HTMLInputElement;
    // Check if thing has changed + do validation?
    if (this.props.value !== input.value) {
      this.props.updateCell(input.value);
    }
  }


  renderInput() {
    const classes = this.props.type === CellType.Number
      ? "number-editable-cell"
      : "text-editable-cell";

    if (this.props.type === CellType.Number) {
      return (
        <input
          className={classes}
          type="text"
          ref="cell"
          onInput={this.handleInput.bind(this)}
          defaultValue={this.props.value} />
      );
    }

    return (
      <TextareaAutosize
        rows={1}
        ref="cell"
        onInput={this.handleInput.bind(this)}
        defaultValue={this.props.value} />
    );
  }

  render() {
    return (
      <td className={this.props.type === CellType.Number ? "right-align" : null}>
        {this.renderInput()}
      </td>
    );
  }
}


export default EditableCell;
