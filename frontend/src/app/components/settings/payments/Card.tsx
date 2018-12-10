import * as React from "react";
import { observer } from "mobx-react";


import rootStore from "../../../stores/RootStore";


interface ICardProps {
  updateCard: () => void;
}

@observer
export class Card extends React.Component<ICardProps, {}> {
  render() {
    const { cardType, cardLast4, cardExpiry } = rootStore.billingStore.sub;
    return (
      <div>
        <hr/>
        <h3>Payment method</h3>
        <p>
          The current card is a <b className="capitalize">{cardType}</b> ending
          in <b>{cardLast4}</b> and expiring on <b>{cardExpiry}</b>.
        </p>
        <div className="change-card">
          <button className="button" onClick={this.props.updateCard}>Change card</button>
        </div>
      </div>
    );
  }
}

export default Card;
