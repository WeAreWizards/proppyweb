import * as React from "react";

import router, { Routes } from "../../routes";

export interface ILinkProps {
  to: Routes;
  params?: object;
  options?: {reload: boolean, refresh: boolean};
}

class Link extends React.Component<ILinkProps, {}> {
  protected static defaultProps = {
    options: {},
    params: {},
  };

  render() {
    const {to, params} = this.props;

    // Build the end url
    const href = router.buildPath(to, params as any);
    if (href === null) {
      // tslint:disable-next-line
      console.error("<Link> Couldn't make URL for", to, params);
    }

    return (
      <a href={href} onClick={this.onClick.bind(this)}>
        {this.props.children}
      </a>
    );
  }

  private onClick(event: React.MouseEvent<{}>) {
    event.preventDefault();
    event.stopPropagation();
    const {to, params, options} = this.props;
    router.navigate(to, params, options);
  }
}

export default Link;
