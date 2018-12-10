import * as React from "react";

interface IFormContainerProps extends React.Props<{}> {
  title: string;
}

export class FormContainer extends React.Component<IFormContainerProps, {}> {
  render() {
    return (
      <div className="form-container">
        <h2 className="form-container__title">{this.props.title}</h2>
        <div className="form-container__content">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default FormContainer;
