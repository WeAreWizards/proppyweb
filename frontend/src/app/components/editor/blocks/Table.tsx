import * as React from "react";
import { isEqual } from "lodash";
import { observer } from "mobx-react";
import { observable } from "mobx";

import { TableBlock, MoveDirection } from "../../../stores/models/Block";
import InlineInput from "../../core/forms/InlineInput";
import EditableCell, { CellType } from "../interface/EditableCell";
import rootStore from "../../../stores/RootStore";


interface ITableProps {
  block: TableBlock;
}

// A normal table, minimum size is 2x2
@observer
export class Table extends React.Component<ITableProps, {}> {
  @observable block: TableBlock;
  @observable version: number = 0;

  constructor(props: ITableProps) {
    super(props);
    this.block = props.block;
  }

  shouldComponentUpdate(nextProps: ITableProps) {
    return !isEqual(this.props.block, nextProps.block);
  }

  componentDidUpdate() {
    this.block = this.props.block;
  }

  update() {
    // force the component to re-render
    this.version += 1;
    // save the block to the store
    rootStore.blockStore.updateTable(this.block);
  }

  addRow() {
    this.block.addRow();
    this.update();
  }

  removeRow(index: number) {
    this.block.removeRow(index);
    this.update();
  }

  addColumn() {
    this.block.addColumn();
    this.update();
  }

  removeColumn(index: number) {
    this.block.removeColumn(index);
    this.update();
  }

  updateContent(val: string, rowIndex: number, colIndex: number) {
    this.block.updateContent(val, rowIndex, colIndex);
    // We don't update the version here otherwise it would re-render on every
    // keystroke
    rootStore.blockStore.updateTable(this.block);
  }

  moveRow(index: number, direction: MoveDirection) {
    this.block.moveRow(index, direction);
    this.update();
  }

  moveColumn(index: number, direction: MoveDirection) {
    this.block.moveColumn(index, direction);
    this.update();
  }

  updateHeader(colIndex: number, val: string) {
    this.block.updateHeader(colIndex, val);
    this.update();
  }

  renderHeaderActions() {
    const numberCols = this.block.data.rows[0].length;

    const colHeaders = [];
    for (let i = 0; i < numberCols; i++) {
      colHeaders.push(
        <td className="fancy-table--editable__row-actions simple-table__col-actions" key={i}>
          {numberCols > 1
            ? <span className="row-action icon-delete" onClick={this.removeColumn.bind(this, i)}  />
            : null}
          {i !== 0
            ? <span className="row-action icon-down"  onClick={() => this.moveColumn(i, MoveDirection.Left)}/>
            : null }
          {i < numberCols - 1
            ? <span className="row-action icon-up" onClick={() => this.moveColumn(i, MoveDirection.Right)} />
            : null}
        </td>,
      );
    }

    return colHeaders;
  }

  renderColGroup() {
    // Add a column header to force the text columns to be as wide as we can fit.
    const numberCols = this.block.data.rows[0].length;
    const percent = `${Math.round(100 / numberCols)}%`;
    const extraCols = [];
    for (let i = 0; i < numberCols; i++) {
      extraCols.push(<col key={i} style={ {width: percent } }/>);
    }

    return (
        <colgroup>
          <col style={ {width: "2rem" } }/>
          {extraCols}
        </colgroup>
    );
  }

  renderHeaders() {
    const numberCols = this.block.data.rows[0].length;

    const colHeaders = [];
    for (let i = 0; i < numberCols; i++) {
      colHeaders.push(
        <th key={i} className="simple-table__col-headers">
          <InlineInput
            fullWidth={true}
            allowEmpty={true}
            value={this.block.data.headers[i]}
            placeholder="Header"
            onEnter={(value: string) => this.updateHeader(i, value)} />
        </th>,
      );
    }

    return colHeaders;
  }

  render() {
    const numberRows = this.block.data.rows.length;
    const rows = this.block.data.rows.map((row, i) => {
      const cols = row.map((col, j) => {
        return (
          <EditableCell
            key={j}
            value={col}
            type={CellType.Text}
            updateCell={(val) => this.updateContent(val, i, j)} />
        );
      });
      const key = `${this.version}-${i}`;
      return (
        <tr key={key}>
          <td className="fancy-table--editable__row-actions" key="remove">
            {numberRows > 1
              ? <span className="row-action icon-delete" onClick={this.removeRow.bind(this, i)} />
              : null}
            {i < numberRows - 1
              ? <span className="row-action icon-down" onClick={() => this.moveRow(i, MoveDirection.Down)} />
              : null}
            {i > 0
              ? <span className="row-action icon-up" onClick={() => this.moveRow(i, MoveDirection.Up)} />
              : null}
          </td>
          {cols}
        </tr>
      );
    });

    return (
      <div id={this.props.block.uid}>
        <table className="fancy-table fancy-table--editable simple-table">
          {this.renderColGroup()}
          <tbody>
            <tr>
              <td key="empty"></td>
              {this.renderHeaderActions()}
              <td className="simple-table__add-col" onClick={this.addColumn.bind(this)}>
                <span className="icon-add" />
              </td>
            </tr>
            <tr>
              <td key="empty"></td>
              {this.renderHeaders()}
              <td key="empty2"></td>
            </tr>
            {rows}
            <tr className="fancy-table--editable__add-row">
              <td colSpan={100}>
                <span className="icon-add" onClick={this.addRow.bind(this)} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default Table;
