import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";

import SettingsContainer from "./SettingsContainer";
import ColorPicker from "./branding/ColorPicker";
import FontPicker from "./branding/FontPicker";
import { injectGoogleFontsTag, removeGoogleFontsTag } from "../../utils/branding";
import { IBranding, DEFAULT_BRANDING } from "../../stores/models/Company";
import rootStore from "../../stores/RootStore";


const HEX_REGEX = /^#[0-9a-f]{6}|#[0-9a-f]{3}$/gi;


@observer
export class BrandingRoute extends React.Component<{}, {}> {
  @observable branding: IBranding = Object.assign({}, DEFAULT_BRANDING);
  @observable fontPicker: {
    kind: string; // headings or text?
    currentFont: string;
  } | null = null;

  componentDidMount() {
    document.title = `Proppy - Branding`;
    this.branding = rootStore.companyStore.us.branding;
  }

  componentDidUpdate() {
    injectGoogleFontsTag([this.branding.fontBody, this.branding.fontHeaders]);
  }

  componentWillUnmount() {
    removeGoogleFontsTag();
  }

  updateColour(name: string, value: string) {
    if (value[0] !== "#") {
      value = "#" + value;
    }

    if (!HEX_REGEX.test(value)) {
      return;
    }
    this.branding[name] = value;
  }

  getFontFamily(kind: string) {
    const font = this.branding[kind];

    if (kind === "fontHeaders") {
      return {fontFamily: `"${font}", sans-serif`};
    }

    return {fontFamily: `"${font}", serif`};
  }

  showFontPicker(kind: string) {
    this.fontPicker = {kind, currentFont: this.branding[kind]};
  }

  changeFont(newFont: string) {
    if (!this.fontPicker) {
      return;
    }

    const kind = this.fontPicker.kind;
    this.branding[kind] = newFont;
    this.fontPicker = null;
    injectGoogleFontsTag([this.branding.fontBody, this.branding.fontHeaders]);
  }

  render() {
    if (!rootStore.companyStore.us) {
      return null;
    }

    return (
      <SettingsContainer>
        <div className="branding">
          <h2>Branding</h2>

          <p className="branding__note">
            Note that branding is <b>applied to every proposal</b>, including proposals
            already published. The branding also only applies for preview and published
            proposals, not in the editor.
          </p>

          { this.fontPicker !== null
            ? <FontPicker
                current={this.fontPicker.currentFont}
                submit={this.changeFont.bind(this)}
                close={() => this.fontPicker = null}/>
            : null}

          <h3>Fonts</h3>
          <div className="branding__fonts">
            <div className="fonts__heading" style={this.getFontFamily("fontHeaders")}>
              Current heading font - {this.branding.fontHeaders}
              <span className="change-font" onClick={this.showFontPicker.bind(this, "fontHeaders")}>
                Change
              </span>
            </div>
            <div className="fonts__text" style={this.getFontFamily("fontBody")}>
              Current text font - {this.branding.fontBody}
              <span className="change-font" onClick={this.showFontPicker.bind(this, "fontBody")}>
                Change
              </span>
            </div>
          </div>

          <hr/>

          <h3>Colours</h3>
          <p className="colours__note">Primary colour is used by links, quotes, comments and buttons.</p>
          <div className="branding__colours">
            <ColorPicker
              name="Primary"
              current={this.branding.primaryColour}
              update={this.updateColour.bind(this, "primaryColour")} />
          </div>

          <hr/>

          <button className="button" onClick={() => rootStore.companyStore.updateBranding(this.branding)}>
            Save changes
          </button>
          <span className="branding__reset" onClick={() => this.branding = Object.assign({}, DEFAULT_BRANDING)}>
            or reset to default
          </span>
        </div>
      </SettingsContainer>
    );
  }
}

export default BrandingRoute;
