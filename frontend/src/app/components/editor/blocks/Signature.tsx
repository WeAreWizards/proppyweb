import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as classnames from "classnames";
import SignaturePad from "signature_pad";

import TextInput from "../../core/forms/TextInput";
import { formatYYYYMMDD } from "../../../utils/dates";
import { RenderContext } from "../../../interfaces";
import { SignatureBlock } from "../../../stores/models/Block";
import { isLoggedIn } from "../../../utils/auth";

import rootStore from "../../../stores/RootStore";


interface ISignatureProps {
  context: RenderContext;
  block: SignatureBlock;
}

@observer
export class Signature extends React.Component<ISignatureProps, {}> {
  signaturePad: any;
  isClient: boolean;
  @observable isSigning: boolean = false;
  @observable name: string = "";

  constructor(props) {
    super(props);
    this.isClient = isLoggedIn() === false;
    this.update = this.update.bind(this);
  }

  update() {
    this.forceUpdate();
  }

  isSigned() {
    return !!this.props.block.data.signature;
  }

  componentDidMount() {
    if (this.isSigned()) {
      return;
    }

    this.resizeCanvas();
    this.signaturePad = new SignaturePad(document.getElementById("signature-pad__canvas"));
    window.addEventListener("resize", this.resizeCanvas.bind(this));
    document.addEventListener("mouseup", this.update);

    // No writing allowed for users
    if (!this.isClient) {
      this.signaturePad.off();
    }
  }

  componentWillUnmount() {
    if (this.isSigned()) {
      return;
    }

    this.signaturePad.off();
    window.removeEventListener("resize", this.resizeCanvas.bind(this));
    document.removeEventListener("mouseup", this.update);
  }

  resizeCanvas() {
    const canvas = this.refs["pad"] as HTMLCanvasElement;
    if (!canvas) {
      return;
    }
    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    const ratio =  Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
  }

  sign() {
    if (!this.canSign()) {
      return;
    }
    this.isSigning = true;

    const signature = this.signaturePad.toDataURL();
    rootStore.sharedStore.sign(this.name, signature)
      .then(() => this.isSigning = false)
      .catch(() => this.isSigning = false);
  }

  canSign() {
    if (!this.isClient || this.props.context !== RenderContext.Share) {
      return false;
    }

    if (this.name !== "" && !this.signaturePad.isEmpty()) {
      return true;
    }
    return false;
  }

  clearPad() {
    this.signaturePad.clear();
    this.forceUpdate();
  }

  loadImage(event: React.SyntheticEvent<any>) {
    const input = event.target as HTMLInputElement;
    const reader = new FileReader();
    const file = input.files[0] as any;
    if (!file) {
      return;
    }
    reader.readAsDataURL(file);
    reader.addEventListener("load", () => {
      this.signaturePad.clear();
      this.signaturePad.fromDataURL(reader.result);
    }, false);
  }

  // Render is completely different is the proposal has been signed
  renderSigned() {
    const data = this.props.block.data;

    return (
      <div className="signature-block signature-block--signed">
        <p>Signed by <b>{data.name}</b> on the <b>{formatYYYYMMDD(data.date)}</b>.</p>
        <img src={data.signature} alt="Signature for the proposal" className="signature" />
      </div>
    );
  }

  render() {
    const { context, block } = this.props;
    if (this.isSigned()) {
      return this.renderSigned();
    }

    const disableInput = !this.isClient || context !== RenderContext.Share || this.isSigning;
    const signClasses = classnames("button sign", {
      "button--disabled": !this.canSign() || this.isSigning,
    });
    const actionClasses = classnames("signature-pad__actions", {
      "signature-pad__actions--disabled": !this.isClient,
    });

    return (
      <div className="signature-block" id={block.uid}>
        <div className="text-input">
          <TextInput
            label="Name"
            value={this.name}
            name="name"
            type="text"
            onChange={(value) => this.name = value}
            disabled={disableInput} />
        </div>

        <div className="signature-pad">
          <div className={actionClasses}>
            <input ref="sig-input" style={{display: "none"}} type="file" onChange={this.loadImage.bind(this)}/>
            Sign below or <span className="action" onClick={() => (this.refs["sig-input"] as any).click()}>upload an image</span>
            <span className="action clear" onClick={this.clearPad.bind(this)}>Clear</span>
          </div>
          <canvas
            ref="pad"
            className={disableInput ? "canvas--disabled" : ""}
            id="signature-pad__canvas" />

          <div className="signature-pad__footer">
            {!this.isClient ? <small>Signature disabled - you can't sign your own proposal</small> : null}
            <button disabled={!this.canSign() || this.isSigning} className={signClasses} onClick={() => this.sign()}>
              Sign
            </button>
          </div>
        </div>
      </div>
    );
  }
}


export default Signature;
