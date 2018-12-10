import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import Link from "../core/Link";
import * as classnames from "classnames";


import FileUploader from "../core/FileUploader";
import { Proposal } from "../../stores/models/Proposal";
import { SharedProposal } from "../../stores/models/SharedProposal";
import rootStore from "../../stores/RootStore";
import {Routes} from "../../routes";


interface ICoverProps {
  proposal: Proposal | SharedProposal;
  editable?: boolean;
}


// Cover image + company logo, neither of them being actually required
@observer
export class Cover extends React.Component<ICoverProps, {}> {
  @observable coverDialogOpen = false;

  setCoverImage(url: string) {
    rootStore.proposalStore.setCoverImage(url);
    this.coverDialogOpen = false;
  }

  renderCoverImage() {
    const { editable, proposal } = this.props;
    const hasCover = proposal.coverImageUrl !== "";

    // no cover and not in the editor? return nothing
    if (!hasCover && !editable) {
      return null;
    }

    if (hasCover) {
      let action = null;
      if (editable) {
        action = (
          <div className="cover__image__action cover__image-clear" onClick={() => this.setCoverImage("")}>
            <div className="align-icons">
              <span className="icon-delete" /><span>Clear cover image</span>
            </div>
          </div>
        );
      }
      return (
        <div className="cover__image cover__image--full">
          <img src={proposal.coverImageUrl} alt="Cover image"/>
          {action}
        </div>
      );
    }

    return (
      <div className="cover__image cover__image--empty">
        <FileUploader
          openFileDialog={this.coverDialogOpen}
          purpose="cover-image"
          onCancel={() => this.coverDialogOpen = false}
          onUpload={(result) => this.setCoverImage(result.url)} />

        <div className="cover__image__action" onClick={() => this.coverDialogOpen = true}>
          <div className="align-icons">
            <span className="icon-upload" /><span>Upload cover image</span>
            <span className="size-recommended">(min 1500px width)</span>
          </div>
        </div>
      </div>
    );
  }

  renderCompanyLogo() {
    const { editable } = this.props;
    const company = rootStore.companyStore.us;
    let content;

    if (editable) {
      content = (
        <Link to={Routes.SettingsCompany}>
          <img src={company.logoUrl ? company.logoUrl : "/img/logo-placeholder.png"} alt=""/>
        </Link>
      );
    } else {
      if (!company.logoUrl) {
        return null;
      }
      content = <img src={company.logoUrl} alt=""/>;
    }

    return (
      <div className="cover__logo">
        {content}
      </div>
    );
  }

  render() {
    const company = rootStore.companyStore.us;
    const { editable, proposal } = this.props;
    const classes = classnames("cover", {
      "cover--editable": editable,
      "cover--empty": !editable && !company.logoUrl && !proposal.coverImageUrl,
    });

    return (
      <div className={classes}>
        {this.renderCoverImage()}
        {this.renderCompanyLogo()}
      </div>
    );
  }
}

export default Cover;
