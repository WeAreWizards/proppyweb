import * as React from "react";
import {observable, computed, action } from "mobx";
import { observer } from "mobx-react";

import { PaymentBlock } from "../../../stores/models/Block";
import { RenderContext } from "../../../interfaces";
import rootStore from "../../../stores/RootStore";
import InlineInput from "../../core/forms/InlineInput";
import { formatCurrency, toCents } from "../../../utils/currencies";


interface IPaymentProps {
  context: RenderContext;
  block: PaymentBlock;
}

declare var StripeCheckout: any;


@observer
export class Payment extends React.Component<IPaymentProps, {}> {
  @observable amount: number;
  @observable percentage: number;
  @observable paymentWaiting: boolean = false;
  scriptLoaded = false;
  stripeHandler: any = null;
  hasPendingClicks: boolean = false;

  constructor(props) {
    super(props);
    this.amount = this.props.block.data.amount;
    this.percentage = this.props.block.data.percentage || 100;
  }

  componentDidUpdate() {
    // Updating a cost table will change the block amount but we need
    // to set this.amount since it's what we use in this component
    if (this.props.block.data.amount !== this.amount) {
      this.amount = this.props.block.data.amount;
    }
  }

  componentDidMount() {
    const stripeNode = document.getElementById("stripe-checkout");
    if (rootStore.companyStore.hasPaymentIntegration && !stripeNode && this.props.context !== RenderContext.Editor) {
      const script = document.createElement("script");
      script.id = "stripe-checkout";
      script.src = "https://checkout.stripe.com/checkout.js";
      script.onload = () => {
        this.scriptLoaded = true;
        this.stripeHandler = StripeCheckout.configure({
          key: rootStore.companyStore.us.integrations.stripe.stripe_publishable_key,
          image: rootStore.companyStore.us.logoUrl || "",
          locale: "auto",
          token: (token) => {
            this.paymentWaiting = true;
            rootStore.sharedStore.payWithStripe(token.id, toCents(this.amountToPay), rootStore.blockStore.proposalCurrency)
              .then(() => this.paymentWaiting = false)
              .catch(() => this.paymentWaiting = false);
          },
        });
        if (this.hasPendingClicks) {
          this.payWithStripe();
        }
      };

      document.body.appendChild(script);
    }
  }

  componentWillUnmount() {
    const stripeNode = document.getElementById("stripe-checkout");
    if (stripeNode) {
      document.body.removeChild(stripeNode);
    }
  }

  renderNoIntegration() {
    return (
      <p>
        You don't have payment integration set up. <br/>
        Go to the <a href="/settings/integrations">settings</a> to add one. We currently only support Stripe. <br/>
        This block will not be rendered on the published proposal.
      </p>
    );
  }

  @action updateAmount(val: string) {
    this.amount = parseFloat(val);
    if (isNaN(this.amount)) {
      this.amount = 0;
    }
    rootStore.blockStore.forcePaymentAmount(this.props.block.uid, this.amount);
  }

  @action updatePercentage(val: string) {
    this.percentage = parseInt(val, 10);
    if (isNaN(this.percentage)) {
      this.percentage = 100;
    }
    rootStore.blockStore.changePaymentPercentage(this.props.block.uid, this.percentage);
  }

  @computed get amountToPay() {
    if (this.percentage === 100) {
      return this.amount;
    }
    return Math.round(((this.amount / 100) * this.percentage));
  }

  renderIntegration() {
    return (
      <div>
        <h3>Payment setup</h3>

        <p>
          Total amount: <InlineInput
            value={this.amount.toString()}
            formatValue={(value) => formatCurrency(value, rootStore.blockStore.proposalCurrency)}
            onEnter={(value) => this.updateAmount(value)} />
        </p>

        <p>
          Percentage of total amount: <InlineInput
          value={this.percentage ? this.percentage : "100"}
          onEnter={(value) => this.updatePercentage(value)} /> %
        </p>
        <br/>
        <p>
          The client will be asked to pay <b>{formatCurrency(this.amountToPay, rootStore.blockStore.proposalCurrency)}</b>. <br/>
          Proppy does not charge any processing fees, only Stripe fees apply.
        </p>
      </div>
    );
  }

  payWithStripe(e?: React.MouseEvent<any>) {
    if (e) {
      e.preventDefault();
    }

    if (this.stripeHandler === null) {
      this.hasPendingClicks = true;
      return;
    }

    this.stripeHandler.open({
      name: rootStore.companyStore.us.name,
      description: rootStore.sharedStore.proposal.title,
      currency: rootStore.blockStore.proposalCurrency,
      // Stripe wants the amount in cents
      amount: toCents(this.amountToPay),
    });
  }

  renderActualPayment() {
    if (!rootStore.companyStore.hasPaymentIntegration || !rootStore.blockStore.proposalCurrency) {
      return null;
    }

    if (this.paymentWaiting) {
      return (
        <div className="proposal-payment">
          <h3>Payment in progress</h3>
        </div>
      );
    }

    const charge = this.props.block.data.charge;
    if (charge && charge.paid) {
      return (
        <div className="proposal-payment proposal-payment--paid">
          <p>
            <span className="icon-payment" />
            {formatCurrency(this.amountToPay, rootStore.blockStore.proposalCurrency)}
            <span className="icon-check"/>
          </p>
        </div>
      );
    }

    return (
      <div className="proposal-payment">
        <div className="proposal-payment__stripe-button">
        <button className="button stripe-button-el"
                onClick={(e) => this.payWithStripe(e)}
                disabled={this.props.context !== RenderContext.Share}>
          <span className="icon-payment" />{formatCurrency(this.amountToPay, rootStore.blockStore.proposalCurrency)}
        </button>
        </div>
      </div>
    );
  }

  render() {
    if (this.props.context !== RenderContext.Editor) {
      return this.renderActualPayment();
    }

    return (
      <div className="proposal-payment-setup" id={this.props.block.uid}>
        {rootStore.companyStore.hasPaymentIntegration
          ? this.renderIntegration()
          : this.renderNoIntegration()
        }
      </div>
    );
  }
}

export default Payment;
