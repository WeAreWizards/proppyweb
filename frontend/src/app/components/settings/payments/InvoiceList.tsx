import * as React from "react";
import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { formatYYYYMMDD } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/currencies";
import rootStore from "../../../stores/RootStore";

@observer
export class InvoiceList extends React.Component<{}, {}> {
  @observable invoices: Array<any> = [];
  @observable loaded: boolean = false;

  loadInvoices() {
    rootStore.billingStore.getInvoices()
      .then((invoices: Array<any>) => {
        action(() => {
          this.invoices = invoices;
          this.loaded = true;
        });
      });
  }

  getStatusIcon(status: string) {
    switch (status) {
      case "paid":
      case "voided":
        return "icon-check";
      case "not_paid":
        return "icon-lost";
      // payment_due and pending
      default:
        return "icon-drafts2";
    }
  }

  renderInvoices() {
    return this.invoices.map((invoice, i) => {
      // amount_paid is in cents
      const { id, status, amount_paid, date } = invoice;
      const description = invoice["line_items"][0]["description"];

      return (
        <tr key={i}>
          <td><span className={this.getStatusIcon(status)} /></td>
          <td>{id}</td>
          <td>{formatYYYYMMDD(date)}</td>
          <td>{formatCurrency(amount_paid / 100, "USD")}</td>
          <td>{description}</td>
          <td><span className="icon-import" onClick={() => rootStore.billingStore.getInvoicePDF(id)}/></td>
        </tr>
      );
    });
  }

  render() {
    if (!this.loaded) {
      return (
        <div className="billing__invoices billing__invoices--hidden">
          <hr/>
          <button className="button" onClick={this.loadInvoices.bind(this)}>Show invoices</button>
        </div>
      );
    }

    return (
      <div className="billing__invoices">
        <hr/>
        <h3>Payment history (amounts shown in USD)</h3>
        <table className="fancy-table invoices-list">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {this.renderInvoices()}
          </tbody>
        </table>
      </div>
    );
  }
}

export default InvoiceList;
