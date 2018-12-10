import * as React from "react";

import rootStore from "../../stores/RootStore";


interface ITemplateProps extends React.Props<{}> {
  uid: string;
  title: string;
}

const TEMPLATE_PICS = {
  "PJML23QAI": "book-template.jpg",
  "5BN1DRBIM": "copywriting-template.jpg",
  "LQROVRA4Y": "mobile-template.jpg",
  "V5GR5H90B": "drupal.jpg",
  "0FBR51C3Y": "wordpress.png",
};

export class Template extends React.Component<ITemplateProps, {}> {
  preview(url) {
    const win = window.open(url, "_blank");
    win.focus();
  }

  render() {
    const { title, uid } = this.props;
    const url = `https://app.proppy.io/p/${uid}`;
    // tslint:disable-next-line
    const background = `linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0) 0%, 
      rgba(0, 0, 0, 0) 60%, 
      rgba(0, 0, 0, 0.65) 100%), 
      url(/img/templates/${TEMPLATE_PICS[uid]}) no-repeat top left / 215px
    `;

    return (
      <div className="template-item">
        <div
          onClick={this.preview.bind(this, url)}
          className="template-item__pic"
          style={{background}}>
          <span className="template-item__title">{title}</span>
        </div>

        <div className="template-item__actions">
          <a href={url} className="align-icons template-action" target="_blank">
            <span className="icon-open"/> Preview
          </a>
          <span className="align-icons template-action" onClick={() => rootStore.dashboardStore.duplicateTemplate(uid)}>
            <span className="icon-duplicate"/> Duplicate
          </span>
        </div>
      </div>
    );
  }
}

export default Template;
