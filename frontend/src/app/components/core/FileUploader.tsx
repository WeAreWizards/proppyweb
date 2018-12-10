import * as React from "react";

import { upload } from "../../utils/upload";
import { UploadPurpose } from "../../interfaces";
import Overlay from "./Overlay";


interface IFileUploaderProps {
  openFileDialog: boolean;
  purpose: UploadPurpose;
  onUpload: (result: any) => void;
  // called when a image is added so we can do an optimistic update
  // and display it immediately rather than waiting for the upload
  onImageAdded?: (dataUrl: string) => void;
  onCancel?: () => void;
}

interface IFileUploaderState {
    uploadingFilename?: string;
}


// Generic file uploader that notifies on success/failure
export class FileUploader extends React.Component<IFileUploaderProps, IFileUploaderState> {
  constructor(props) {
    super(props);
    this.state = {uploadingFilename: null};
  }

  componentDidUpdate() {
    if (this.props.openFileDialog && this.refs["uploader"]) {
      (this.refs["uploader"] as HTMLInputElement).click();
      // Focus event don't bubble so we can't use addEventListener
      document.body.onfocus = this.checkIfCancelled.bind(this);
    }
  }

  componentWillUnmount() {
    document.body.onfocus = null;
  }

  checkIfCancelled() {
    const input = this.refs["uploader"] as HTMLInputElement;
    if (input && !input.value.length && this.props.onCancel) {
      this.props.onCancel();
    }
  }

  onChange(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const data = new FormData();
    const file = (event.target as HTMLInputElement).files[0];
    data.append("file", file);
    this.setState({uploadingFilename: file.name});
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener("load", () => {
      if (this.props.onImageAdded) {
        this.props.onImageAdded(reader.result);
      }
    }, false);

    upload(data, this.props.purpose)
      .then(result => {
        this.setState({uploadingFilename: null});
        this.props.onUpload(result);
      }).catch(() => {
        this.setState({uploadingFilename: null});
      });
  }

  render() {
    if (this.state.uploadingFilename !== null) {
      return (
        <Overlay onClick={() => null}>
          <div className="uploading-feedback">
            <h1>Uploading {this.state.uploadingFilename}</h1>
            <div className="sk-three-bounce">
              <div className="sk-child sk-bounce1"></div>
              <div className="sk-child sk-bounce2"></div>
             <div className="sk-child sk-bounce3"></div>
            </div>
          </div>
        </Overlay>
      );
    }
    return (
      <input
        ref="uploader"
        type="file"
        style={{display: "none"}}
        onChange={this.onChange.bind(this)} />
    );
  }
}

export default FileUploader;
