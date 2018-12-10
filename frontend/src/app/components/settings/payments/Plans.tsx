import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as classnames from "classnames";

import rootStore from "../../../stores/RootStore";
import CancelDialog from "./CancelDialog";


enum TimePeriod {
  Monthly,
  Yearly,
}

interface IPlanProps {
  onClick: any;
}

// Same html as the landing page but with renaming of class -> className for react
@observer
export class Plans extends React.Component<IPlanProps, {}> {
  @observable period: TimePeriod;
  @observable showCancelDialog = false;

  constructor(props) {
    super(props);

    const activePlan = rootStore.billingStore.sub.activePlan;
    this.period = !activePlan || activePlan.indexOf("yearly") === -1
      ? TimePeriod.Monthly
      : TimePeriod.Yearly;
  }


  renderCTA(planId: string): any {
    const activePlan = rootStore.billingStore.sub.activePlan;
    const { onClick } = this.props;

    if (activePlan === planId && rootStore.billingStore.sub.canCancel) {
      return (<span><b>Current plan</b></span>);
    }

    if (activePlan !== null) {
      return (
        <button className="button" onClick={() => onClick(planId)}>Change plan</button>
      );
    }

    return (
      <button className="button" onClick={() => onClick(planId)}>Subscribe</button>
    );
  }

  renderPeriodToggle() {
    const monthlyClasses = classnames("monthly", {
      "period-toggle--active": this.period === TimePeriod.Monthly,
    });
    const yearlyClasses = classnames("yearly", {
      "period-toggle--active": this.period === TimePeriod.Yearly,
    });
    return (
      <div className="period-toggle">
        <span className={monthlyClasses} onClick={() => this.period = TimePeriod.Monthly}>Monthly</span>
        <span className={yearlyClasses} onClick={() => this.period = TimePeriod.Yearly}>Yearly (2 months free)</span>
      </div>
    );
  }

  renderCancel() {
    const activePlan = rootStore.billingStore.sub.activePlan;
    if (activePlan === null || (activePlan !== null && !rootStore.billingStore.sub.canCancel)) {
      return null;
    }

    return (
      <div className="cancel-plan">
        <button className="button button--dangerous" onClick={() => this.showCancelDialog = true}>Cancel</button>
      </div>
    );
  }

  render() {
    const activePlan = rootStore.billingStore.sub.activePlan;

    const getPlanClasses = (name: string) => {
      return classnames("plan", {
        "plan--active": rootStore.billingStore.sub.canCancel &&
        (
          (activePlan === name && this.period === TimePeriod.Monthly) ||
          (activePlan === name + "-yearly" && this.period === TimePeriod.Yearly)
        ),
      });
    };

    return (
      <div className="billing__plans">
        <h3>Plans</h3>
        {this.renderPeriodToggle()}

        {this.showCancelDialog
          ? <CancelDialog onCancel={() => this.showCancelDialog = false} />
          : null}

        <div className="plans">

          <div className={getPlanClasses("basic")}>
            <span className="plan__name">Basic</span>
            <div className="plan__price">
              <span className="plan__price__currency">$</span>
              <span className="plan__price__number">{this.period === TimePeriod.Monthly ? 20 : 200}</span>
              <span className="plan__price__time">/{this.period === TimePeriod.Monthly ? "month" : "year"}</span>
            </div>
            <hr/>
            <span className="plan__limit">
              5 <b>active</b> proposals
            </span>
            <hr/>
            <ul>
              <li><span className="tick">✔</span> Unlimited users</li>
              <li><span className="tick">✔</span> E-signatures</li>
              <li><span className="tick">✔</span> Analytics</li>
              <li><span className="tick">✔</span> All integrations</li>
            </ul>
          </div>

          <div className={getPlanClasses("professional")}>
            <span className="plan__name">Professional</span>
            <div className="plan__price">
              <span className="plan__price__currency">$</span>
              <span className="plan__price__number">{this.period === TimePeriod.Monthly ? 50 : 500}</span>
              <span className="plan__price__time">/{this.period === TimePeriod.Monthly ? "month" : "year"}</span>
            </div>
            <hr/>
            <span className="plan__limit">
              30 <b>active</b> proposals
            </span>
            <hr/>
            <ul>
              <li><span className="tick">✔</span> Unlimited users</li>
              <li><span className="tick">✔</span> E-signatures</li>
              <li><span className="tick">✔</span> Analytics</li>
              <li><span className="tick">✔</span> All integrations</li>
              <li><span className="tick">✔</span> Custom domain</li>
            </ul>
          </div>

          <div className={getPlanClasses("enterprise")}>
            <span className="plan__name">Enterprise</span>
            <div className="plan__price">
              <span className="plan__price__currency">$</span>
              <span className="plan__price__number">{this.period === TimePeriod.Monthly ? 100 : 1000}</span>
              <span className="plan__price__time">/{this.period === TimePeriod.Monthly ? "month" : "year"}</span>
            </div>
            <hr/>
            <span className="plan__limit">
              100 <b>active</b> proposals
            </span>
            <hr/>
            <ul>
              <li><span className="tick">✔</span> Unlimited users</li>
              <li><span className="tick">✔</span> E-signatures</li>
              <li><span className="tick">✔</span> Analytics</li>
              <li><span className="tick">✔</span> All integrations</li>
              <li><span className="tick">✔</span> Custom domain</li>
            </ul>
          </div>
        </div>
        {this.renderCancel()}
      </div>
    );
  }
}

export default Plans;
