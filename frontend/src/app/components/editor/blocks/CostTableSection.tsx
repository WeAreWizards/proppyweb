import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { isEqual } from "lodash";


import InlineInput from "../../core/forms/InlineInput";
import CurrencySelect from "../../core/CurrencySelect";
import EditableCell, { CellType } from "../interface/EditableCell";
import { formatCurrency } from "../../../utils/currencies";
import { CostTableSection as CostTableSectionClass } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";


interface ICostTableSectionProps {
  blockUid: string;
  section: CostTableSectionClass;
  sectionIndex: number;
  addSection: () => void;
  removeSection: () => void;
  moveSection: (direction: number) => void;
  headers: string[];
  currency: string;
  setCurrency: (newCurrency: string) => void;
  hideActions: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  proposalId: number;
}


@observer
export class CostTableSection extends React.Component<ICostTableSectionProps, {}> {
  @observable section: CostTableSectionClass;
  version: number = 0;

  constructor(props) {
    super(props);
    this.section = props.section;
    this.section.calculateTotal();
  }

  shouldComponentUpdate(nextProps: ICostTableSectionProps) {
    return !isEqual(this.section, nextProps.section) || !isEqual(this.props.headers, nextProps.headers);
  }

  componentDidUpdate() {
    this.section = this.props.section;
    this.section.calculateTotal();
  }

  removeRow(ix: number) {
    const newSection = this.section.clone();
    newSection.rows.splice(ix, 1);
    this.version += 1;
    rootStore.blockStore.saveSectionCostTable(this.props.blockUid, this.props.sectionIndex, newSection);
    rootStore.blockStore.incrementTableVersion(this.props.blockUid);
  }

  addRow() {
    const newSection = this.section.clone();
    newSection.addRow();
    rootStore.blockStore.saveSectionCostTable(this.props.blockUid, this.props.sectionIndex, newSection);
    rootStore.blockStore.incrementTableVersion(this.props.blockUid);
  }

  onTitleChange(event: React.SyntheticEvent<any>) {
    const field = event.target as HTMLInputElement;
    const newSection = this.section.clone();
    newSection.title = field.value;
    rootStore.blockStore.saveSectionCostTable(this.props.blockUid, this.props.sectionIndex, newSection);
  }

  updateCell(rowIndex: number, colIndex: number, value: string) {
    const newSection = this.section.clone();
    newSection.rows[rowIndex][colIndex] = value;
    rootStore.blockStore.saveSectionCostTable(this.props.blockUid, this.props.sectionIndex, newSection);
  }

  moveRow(currentIndex: number, indexWanted: number) {
    const newSection = this.section.clone();
    const toSwap = newSection.rows[indexWanted];
    newSection.rows[indexWanted] = newSection.rows[currentIndex];
    newSection.rows[currentIndex] = toSwap;
    this.version += 1;
    rootStore.blockStore.saveSectionCostTable(this.props.blockUid, this.props.sectionIndex, newSection);
    rootStore.blockStore.incrementTableVersion(this.props.blockUid);
  }

  renderRows() {
    const rows = [];
    const numberRows = this.section.rows.length;

    this.section.rows.map((row, rowIndex) => {
      const canMoveUp = numberRows > 1 && rowIndex > 0;
      const canMoveDown = numberRows > 1 && rowIndex < numberRows - 1;

      const cells = [
        (
          <td className="fancy-table--editable__row-actions" key="remove">
            <span className="row-action icon-delete" onClick={this.removeRow.bind(this, rowIndex)} />
            {canMoveDown
              ? <span className="row-action icon-down" onClick={this.moveRow.bind(this, rowIndex, rowIndex + 1)} />
              : null}
            {canMoveUp
              ? <span className="row-action icon-up" onClick={this.moveRow.bind(this, rowIndex, rowIndex - 1)} />
              : null}
          </td>
        ),
      ];

      // The last value "total" is just a <td> not an EditableCell so
      // we slice:
      row.slice(0, -1).map((cell, colIndex) => {
        const type = colIndex === 0 ? CellType.Text : CellType.Number;
        cells.push(
          <EditableCell
            key={colIndex}
            value={cell}
            type={type}
            updateCell={this.updateCell.bind(this, rowIndex, colIndex)} />,
        );
      });
      cells.push(
        <td key="total" className="fancy-table__total">
          {formatCurrency(row[row.length - 1], this.props.currency)}
        </td>,
      );
      const key = `${this.version}-${rowIndex}`;
      rows.push(<tr key={key} className="fancy-table--editable__cost-row">{cells}</tr>);
    });

    return rows;
  }

  renderDeleteSection() {
    return (
      <div className="cost-section-deleter align-icons"
           onClick={this.props.removeSection}>
        <span className="icon-delete" /> Delete subsection
      </div>
    );
  }

  renderMoveUp() {
    if (!this.props.canMoveUp) {
      return null;
    }

    return (
      <div className="cost-section-mover align-icons"
           onClick={() => this.props.moveSection(-1)}>
        <span className="icon-up" /> Move up
      </div>
    );
  }

  renderMoveDown() {
    if (!this.props.canMoveDown) {
      return null;
    }

    return (
      <div className="cost-section-mover align-icons"
           onClick={() => this.props.moveSection(1)}>
        <span className="icon-down" /> Move down
      </div>
    );
  }

  renderActions() {
    if (this.props.hideActions) {
      return null;
    }

    return (
      <div className="cost-table__section__actions">
        {this.renderDeleteSection()}
        {this.renderMoveUp()}
        {this.renderMoveDown()}
      </div>
    );
  }

  renderSubtotal() {
    // Hide section subtotal when we have only one section to avoid two subtotals next to each other
    if (this.props.hideActions) {
      return null;
    }

    return (
      <tfoot>
        <tr>
          <td colSpan={5} className="right-align subtotal">
            {formatCurrency(this.section.total || 0, this.props.currency)}
          </td>
        </tr>
      </tfoot>
    );
  }

  renderCurrencyPicker() {
    const { hideActions, currency, canMoveUp, setCurrency } = this.props;
    // Currency picker only appears in the first section
    if (!hideActions && canMoveUp) {
      return null;
    }

    return <CurrencySelect currentCurrency={currency} onChange={setCurrency} />;
  }

  getHeader(index: number, defaultValue: string): string {
    const val = this.props.headers[index];
    return val === null ? defaultValue : val;
  }

  updateHeaderLabel(ix: number, val: string) {
    const updated = this.props.headers.slice();
    updated[ix] = val;
    rootStore.blockStore.setHeadersCostTable(this.props.blockUid, updated);
  }

  render() {
    return (
      <div className="fancy-table fancy-table--editable cost-table__section">
        <input
          placeholder="Cost table subsection title"
          className="cost-table__section-title"
          onChange={this.onTitleChange.bind(this)}
          defaultValue={this.section.title || ""} />
        {this.renderCurrencyPicker()}
        {this.renderActions()}

        <table>
          <thead>
            <tr>
              <th />
              <th>
                <InlineInput
                  fullWidth={true}
                  allowEmpty={true}
                  value={this.getHeader(0, "Description")}
                  onEnter={(value) => this.updateHeaderLabel(0, value)} />
              </th>
              <th className="right-align">
                <InlineInput
                  fullWidth={true}
                  allowEmpty={true}
                  value={this.getHeader(1, "Rate")}
                  onEnter={(value) => this.updateHeaderLabel(1, value)} />
              </th>
              <th className="right-align">
                <InlineInput
                  fullWidth={true}
                  allowEmpty={true}
                  value={this.getHeader(2, "Quantity")}
                  onEnter={(value) => this.updateHeaderLabel(2, value)} />
              </th>
              <th className="right-align">
                <InlineInput
                  fullWidth={true}
                  allowEmpty={true}
                  value={this.getHeader(3, "Subtotal")}
                  onEnter={(value) => this.updateHeaderLabel(3, value)} />
              </th>
            </tr>
          </thead>
          <tbody>
            {this.renderRows()}
            <tr className="fancy-table--editable__add-row">
              <td colSpan={5} onClick={this.addRow.bind(this)}>Add a row</td>
            </tr>
          </tbody>
          {this.renderSubtotal()}
        </table>

        <div className="primary-divider">
          <button
            onClick={this.props.addSection}
            className="button button--round button--editor">
            <span className="icon-plus"/>
          </button>
        </div>
      </div>
    );
  }
}


export default CostTableSection;
