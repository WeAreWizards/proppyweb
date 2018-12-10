// This is the client read-only renderer for cost tables.
import * as React from "react";

import { formatCurrency } from "../../utils/currencies";
import { unescape } from "../../utils/html";
import { CostTableBlock } from "../../stores/models/Block";


interface ICostTableRenderProps {
  block: CostTableBlock;
}


export class CostTableRender extends React.Component<ICostTableRenderProps, {}> {
  renderRows(rows: Array<any>, currency: any) {
    return rows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const classes = colIndex > 0 ? "right-align" : "row-description";
        // col 1 and 3 are $$
        return (
          <td key={colIndex} className={classes}>
            {[1, 3].indexOf(colIndex) > -1 ? formatCurrency(cell, currency) : cell}
          </td>
        );
      });
      return (<tr key={rowIndex}>{cells}</tr>);
    });
  }

  getHeader(index: number, defaultValue: string): string {
    if (!this.props.block.data.headers) {
      return defaultValue;
    }
    const val = this.props.block.data.headers[index] || null;
    return val === null ? defaultValue : val;
  }

  renderSections() {
    const data = this.props.block.data;
    const numberSections = data.sections.length;
    const hideSubtotal = numberSections === 1;

    const currency = data.currency;
    return data.sections.map((section, index) => {
      return (
        <div className="fancy-table fancy-table--render" key={index}>
          <h4>{unescape(section.title)}</h4>
          <table className="fixed-table">
            <thead>
              <tr>
                <th>{this.getHeader(0, "Description")}</th>
                <th className="right-align">{this.getHeader(1, "Rate")}</th>
                <th className="right-align">{this.getHeader(2, "Quantity")}</th>
                <th className="right-align">{this.getHeader(3, "Subtotal")}</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows(section.rows, currency)}
            </tbody>
            {hideSubtotal ? null :
              <tfoot>
                <tr>
                  <td colSpan={3} className="right-align subtotal" />
                  <td className="right-align">
                    {formatCurrency(section.total || 0, currency)}
                  </td>
                </tr>
              </tfoot>
              }
          </table>
        </div>
      );
    });
  }

  renderDiscount(data, currency) {
    const discountPercent = data.discountPercent || 0;
    if (discountPercent === 0) {
      return null;
    }

    return (
      <tr>
        <td colSpan={4} className="right-align">
          {discountPercent}{data.discountLabel || "% discount"}
        </td>
        <td className="right-align">{formatCurrency(data.discountValue || 0, currency)}</td>
      </tr>
    );
  }

  render() {
    const data = this.props.block.data;
    const currency = data.currency;
    const removeTotalBorder = data.sections.length === 1;

    const subtotal = formatCurrency(data.subtotal || 0, currency);
    const total = formatCurrency(data.total || 0, currency);

    // If total and subtotal are the same then showing the subtotal
    // adds nothing, so we hide it.
    const hideSubtotal = subtotal === total;

    let totalClasses = "fancy-table fancy-table--render fancy-table__totals ";
    if (removeTotalBorder) {
      totalClasses += " fancy-table--no-top-border";
    }

    return (
      <div className="cost-table">
        {this.renderSections()}

        <div className={totalClasses}>
          <table>
            <tbody>
              {hideSubtotal ? null :
              <tr>
                <td colSpan={4} className="right-align">{data.subtotalLabel || "Subtotal"}</td>
                <td className="right-align">{subtotal}</td>
              </tr>}
              {this.renderDiscount(data, currency)}
              <tr>
                <td colSpan={4} className="right-align">{data.totalLabel || "Total"}</td>
                <td className="right-align">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}


export default CostTableRender;
