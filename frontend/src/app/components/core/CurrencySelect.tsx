import * as React from "react";

import Select from "./select/Select";
import { CURRENCY_OPTIONS } from "../../utils/currencies";



interface ICurrencySelectProps extends React.Props<{}> {
  currentCurrency: string;
  onChange: (newCurrency: string) => void;
}


export class CurrencySelect extends React.Component<ICurrencySelectProps, {}> {
  render() {
    const currentCurrency = this.props.currentCurrency;
    const options = CURRENCY_OPTIONS.map(x => ({label: x.label, value: x.code}));

    return (
      <Select
        value={currentCurrency}
        valueAsPlaceholder={true}
        placeholder=""
        options={options}
        allowSearch={true}
        allowCreate={false}
        className="proppy-select--currency"
        onChange={this.props.onChange} />
    );
  }
}

export default CurrencySelect;
