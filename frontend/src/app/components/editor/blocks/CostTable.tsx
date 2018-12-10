import * as React from "react";
import { observer } from "mobx-react";
import { isEqual } from "lodash";

import { formatCurrency, getCurrencyCode } from "../../../utils/currencies";
import CostTableSection from "./CostTableSection";
import InlineInput from "../../core/forms/InlineInput";
import { CostTableBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";


interface ICostTableProps {
  block: CostTableBlock;
}

@observer
export class CostTable extends React.Component<ICostTableProps, {}> {
  shouldComponentUpdate(nextProps: ICostTableProps) {
    return !isEqual(this.props.block, nextProps.block);
  }

  onChangeDiscount(event: React.SyntheticEvent<any>) {
    const target = event.target as HTMLInputElement;
    rootStore.blockStore.setDiscountCostTable(this.props.block.uid, target.value);
  }

  addSection(sectionIndex: number) {
    rootStore.blockStore.addSectionCostTable(this.props.block.uid, sectionIndex);
  }

  removeSection(sectionIndex: number) {
    rootStore.blockStore.removeSectionCostTable(this.props.block.uid, sectionIndex);
  }

  moveSection(sectionIndex: number, direction: number) {
    rootStore.blockStore.moveSectionCostTable(this.props.block.uid, sectionIndex, direction);
  }

  renderSections() {
    let block = this.props.block;
    if (!(block instanceof CostTableBlock)) {
      block = (block as any).asCostTableBlock();
    }

    const headers = block.data.headers || [null, null, null, null];
    const uid = block.uid;
    const version = rootStore.blockStore.getTableVersion(uid);

    // does not use ix as key as we can insert things in the middle
    // which would screw up react. We could also generate uuids
    return block.data.sections.map((section, ix) => {
      const key = `${version}-${ix}`;
      return (
        <CostTableSection
          key={key}
          headers={headers}
          section={section}
          addSection={() => this.addSection(ix)}
          removeSection={() => this.removeSection(ix)}
          moveSection={(direction: number) => this.moveSection(ix, direction)}
          sectionIndex={ix}
          blockUid={uid}
          currency={getCurrencyCode(this.props.block.data.currency)}
          setCurrency={(curr: string) => rootStore.blockStore.setCurrencyCostTable(this.props.block.uid, curr)}
          proposalId={this.props.block.proposalId}
          hideActions={ix === 0 && this.props.block.data.sections.length === 1}
          canMoveUp={ix > 0}
          canMoveDown={ix < this.props.block.data.sections.length - 1}
        />
      );
    });
  }

  render() {
    const { uid, data } = this.props.block;
    const hideSubtotal = data.total === data.subtotal;

    return (
      <div className="cost-table" id={this.props.block.uid}>
        {this.renderSections()}

        <div className="fancy-table fancy-table--editable fancy-table__totals">
          <table>
            <tbody>
              {hideSubtotal ? null :
                <tr>
                  <td colSpan={4} className="right-align">
                    <InlineInput
                      fullWidth={true}
                      allowEmpty={true}
                      value={data.subtotalLabel || "Subtotal"}
                      onEnter={(value) => rootStore.blockStore.setLabelCostTable(uid, "subtotalLabel", value)}/>
                  </td>
                  <td
                    className="right-align">{formatCurrency(data.subtotal, data.currency)}</td>
                </tr>
              }
              <tr className="discount-row">
                <td colSpan={4} className="right-align">
                  <input value={data.discount} onChange={this.onChangeDiscount.bind(this)}/>

                  <InlineInput
                    fullWidth={false}
                    allowEmpty={true}
                    value={data.discountLabel || "% discount"}
                    onEnter={(value) => rootStore.blockStore.setLabelCostTable(uid, "discountLabel", value)} />
                </td>
                <td className="right-align">{formatCurrency(data.discountValue, data.currency)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="right-align">
                  <InlineInput
                    fullWidth={true}
                    allowEmpty={true}
                    value={data.totalLabel || "Total"}
                    onEnter={(value) => rootStore.blockStore.setLabelCostTable(uid, "totalLabel", value)} />
                </td>
                <td className="right-align">{formatCurrency(data.total, data.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    );
  }
}


export default CostTable;
