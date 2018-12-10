import * as React from "react";

import Select from "../../core/select/Select";
import Dialog from "../../core/Dialog";
import fetchling from "../../../utils/fetchling";
import { injectGoogleFontsTag } from "../../../utils/branding";


interface IFontPickerProps {
  current: string;
  submit: (font: string) => void;
  close: () => void;
}

interface IFontPickerState {
  fonts: Array<any>;
  current: string;
}


export class FontPicker extends React.Component<IFontPickerProps, IFontPickerState> {
  constructor(props) {
    super(props);
    this.state = {
      fonts: [],
      current: props.current,
    };

    fetchling("/companies/available-fonts")
      .get()
      .then((resp: any) => {
        const fonts = resp.fonts.map(f => {
          return {label: f, value: f};
        });

        this.setState({fonts} as any);
      });
  }

  onChange(value: string) {
    injectGoogleFontsTag([value]);
    this.setState({current: value} as any);
  }

  render() {
    const { close, submit } = this.props;
    const { fonts, current } = this.state;

    if (fonts.length === 0) {
      return (
        <div className="font-picker">
          <Dialog title="Pick a font" actions={[]} onClose={close}>
            <p className="font-picker__loading">Loading...</p>
          </Dialog>
        </div>
      );
    }

    const actions = [
      {label: "Cancel", onClick: close},
      {label: "Pick", onClick: submit.bind(this, current), disabled: this.props.current === current},
    ];

    return (
      <div className="font-picker">
        <Dialog title="Pick a font" actions={actions} onClose={close}>
          <Select
            allowCreate={false}
            allowSearch={true}
            value={current}
            valueAsPlaceholder={true}
            className="proppy-select--font-picker"
            placeholder="Select"
            options={fonts}
            onChange={this.onChange.bind(this)} />

          <p className="font-picker__tip">Try editing the text below:</p>
          <textarea
            placeholder="Test the font here"
            defaultValue="The quick brown fox jumps over the lazy dog"
            name="preview"
            cols={30}
            spellCheck={false}
            contentEditable={true}
            style={{fontFamily: current}}
            className="font-picker__preview" />
        </Dialog>
      </div>
    );
  }
}

export default FontPicker;
