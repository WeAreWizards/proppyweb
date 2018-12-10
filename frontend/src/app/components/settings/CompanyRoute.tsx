import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";


import FileUploader from "../core/FileUploader";
import InAppForm from "../core/forms/InAppForm";
import SettingsContainer from "./SettingsContainer";
import rootStore from "../../stores/RootStore";



@observer
export class CompanyRoute extends React.Component<{}, {}> {
  @observable logoDialogOpen = false;
  @observable logoDataUrl = "";

  componentDidMount() {
    document.title = `Proppy - Company settings`;
  }

  uploadLogo(result: any) {
    rootStore.companyStore.updateLogo(result.url)
      .then(() => {
        this.logoDialogOpen = false;
        this.logoDataUrl = "";
      })
      .catch(() => {
        this.logoDialogOpen = false;
        this.logoDataUrl = "";
      });
  }

  removeLogo() {
    this.logoDialogOpen = false;
    this.logoDataUrl = "";
    rootStore.companyStore.updateLogo("");
  }

  render() {
    const company = rootStore.companyStore.us;
    if (!company) {
      return null;
    }

    const INPUTS = {
      currency: {
        type: "currency-select",
        initial: company.currency,
      },
      companyName: {
        type: "text",
        label: "Company Name",
        initial: company.name,
      },
    };

    // Optimistic update so if we are uploading something we use
    // the data url to show it
    let logo = "/img/logo-placeholder.png";
    if (this.logoDataUrl !== "") {
      logo = this.logoDataUrl;
    } else if (company.logoUrl) {
      logo = company.logoUrl;
    }

    return (
      <SettingsContainer>
        <h2>Company settings</h2>
        <div className="company-logo">
          <img
            src={logo}
            onClick={() => this.logoDialogOpen = true} />

          <FileUploader
            openFileDialog={this.logoDialogOpen}
            purpose="company-logo"
            onCancel={() => this.logoDialogOpen = false}
            onImageAdded={(dataUrl) => this.logoDataUrl = dataUrl}
            onUpload={this.uploadLogo.bind(this)} />

          <button className="button" onClick={() => this.logoDialogOpen = true}>Upload image</button>
          {company.logoUrl
            ? <div>or <span className="remove-logo" onClick={this.removeLogo.bind(this)}>remove</span></div>
            : null}
        </div>

        <InAppForm
          resetOnSuccess
          submitText="Save changes"
          inputs={INPUTS}
          onSubmit={rootStore.companyStore.updateUs.bind(rootStore.companyStore)} />
      </SettingsContainer>
    );
  }
}

export default CompanyRoute;
