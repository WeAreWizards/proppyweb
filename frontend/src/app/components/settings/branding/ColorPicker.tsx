import * as React from "react";


import InlineInput from "../../core/forms/InlineInput";


interface IColorPickerProps {
  name: string;
  current: string;
  update: (newValue: string) => void;
}

export class ColorPicker extends React.Component<IColorPickerProps, {}> {
  render() {
    return (
      <div className="colour">
        <h4>{this.props.name}</h4>
        <div style={{background: this.props.current}} className="colour__sample"></div>
        <InlineInput
          value={this.props.current}
          onEnter={this.props.update}
          fullWidth={true} />
      </div>
    );
  }
}

export default ColorPicker;
