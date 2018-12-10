import * as React from "react";
import { observer } from "mobx-react";


import { getNumberOfDaysUntil } from "../../../utils/dates";
import rootStore from "../../../stores/RootStore";


// Those should not change that often
const PRICES = {
  "basic": 20,
  "basic-yearly": 200,
  "professional": 50,
  "professional-yearly": 500,
  "enterprise": 100,
  "enterprise-yearly": 1000,
};


@observer
export class BillingStatus extends React.Component<{}, {}> {
  render() {
    if (!rootStore.billingStore.sub) {
      return null;
    }

    const {
      plan, isChargebeeSubscription, status, trialEnd, trialHasEnded,
    } = rootStore.billingStore.sub;

    if (trialHasEnded && status === "in_trial") {
      return (
        <div>
          <p>Your trial is now over. Your published proposals will stay
             published, and you can continue editing them, but you cannot publish any new proposals.</p>
          <p>Please subscribe to a plan to enable publishing again.</p>
        </div>
      );
    }

    if (status === "in_trial" && !isChargebeeSubscription) {
      return (
        <div>
          <p>Your trial will end in {getNumberOfDaysUntil(trialEnd)} days.</p>
          <p>If you choose to subscribe before the end of your trial, we will not charge you until the trial ends.</p>
        </div>
      );
    }

    if (status === "in_trial" && isChargebeeSubscription) {
      return (
        <div>
          <p>
            Thanks for signing up to the <b className="capitalize">{plan}</b> plan. <br/>
            You still have {getNumberOfDaysUntil(trialEnd)} trial days left before the
            first payment of <b>${PRICES[plan]}</b> (pro-rata and coupons not included).
          </p>
        </div>
      );
    }

    if (status === "active") {
      return (
        <div>
          <p>You are currently signed up to the <b className="capitalize">{plan}</b> plan.</p>
        </div>
      );
    }

    if (status === "non_renewing") {
      return (
        <div>
          <p>You are currently signed up to the <b className="capitalize">{plan}</b> plan.</p>
          <p>Your subscription will stop at the end of this billing period.</p>
        </div>
      );
    }


    if (status === "cancelled") {
      return (
        <div>
          <p>
            Your subscription has been cancelled. Your published proposals will stay
            published, and you can continue editing them, but you cannot publish any new proposals.
          </p>
          <p>Please subscribe to a plan to enable publishing again.</p>
        </div>
      );
    }
    return null;
  }
}

export default BillingStatus;
