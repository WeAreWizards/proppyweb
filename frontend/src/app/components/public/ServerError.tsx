import * as React from "react";


interface IServerErrorProps {
  error?: string;
}

export class ServerError extends React.Component<IServerErrorProps, {}> {
  render() {
    const error = this.props.error;
    if (error === undefined || error === null) {
      return null;
    }

    return (
      <div className="alert alert--error">{error}</div>
    );
  }
}

export default ServerError;
