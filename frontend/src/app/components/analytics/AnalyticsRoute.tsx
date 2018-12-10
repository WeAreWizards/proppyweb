import * as React from "react";
import { observer } from "mobx-react";


import rootStore from "../../stores/RootStore";
import VersionAnalytics from "./VersionAnalytics";


declare var __SITE_BASE_URL__: string;


@observer
class AnalyticsRoute extends React.Component<{}, {}> {
  get store() {
    return rootStore.analyticsStore;
  }

  componentWillUnmount() {
    this.store.clear();
  }

  renderVersionAnalytics() {
    const versions = this.store.data.map((a: any, i: number) => {
      const url = `${__SITE_BASE_URL__}/p/${this.store.proposal.shareUid}/${a.version}`;
      return <VersionAnalytics data={a} url={url} key={a.version} current={i === 0} />;
    });

    return (
      <div>
        {versions}
      </div>
    );
  }

  render() {
    return (
      <div className="restrict-width analytics-page">
        <h1>Analytics for {this.store.proposal.title}</h1>
        {this.store.data.length > 0
        ? this.renderVersionAnalytics()
        : "Only published proposals will be tracked."}
      </div>
    );
  }
}

export default AnalyticsRoute;
