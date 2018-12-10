import * as React from "react";

import { TableBlock } from "../../stores/models/Block";


interface ITableRenderProps {
  block: TableBlock;
}

// A rendered normal table, minimum size is 2x2
export class TableRender extends React.Component<ITableRenderProps, {}> {
  renderHeaders() {
    if (!this.props.block.hasHeaders()) {
      return null;
    }

    return (
      <thead>
        <tr>
          {this.props.block.data.headers.map((header, i) => {
            return <th key={i}>{header}</th>;
          })}
        </tr>
      </thead>
    );
  }

  renderRows() {
    return this.props.block.data.rows.map((row, i) => {
      const cols = row.map((cell, colIndex) => {
        return (<td className="table-cell" key={colIndex}>{cell}</td>);
      });
      return (<tr key={i}>{cols}</tr>);
    });
  }

  render() {
    return (
      <div className="fancy-table fancy-table--render">
        <table>
          {this.renderHeaders()}
          <tbody>
            {this.renderRows()}
          </tbody>
        </table>
      </div>
    );
  }
}

export default TableRender;
