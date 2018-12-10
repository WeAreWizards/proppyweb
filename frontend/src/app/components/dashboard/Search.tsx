import * as React from "react";
import { observer } from "mobx-react";


import rootStore from "../../stores/RootStore";


@observer
export class Search extends React.Component<{}, {}> {
  componentWillMount() {
    // Initialize search from "#q=..." location hash.
    const m = window.location.hash.match(/q=(.+)/);
    if (m === null || m.length < 2) {
      return;
    }
    rootStore.dashboardStore.setSearch(decodeURIComponent(m[1]));
  }

  updateQuery(event: React.SyntheticEvent<any>) {
    const target = event.target as HTMLInputElement;
    rootStore.dashboardStore.setSearch(target.value);
  }

  render() {
    const value = rootStore.dashboardStore.isOnTemplatePage()
      ? ""
      : rootStore.dashboardStore.query.input;

    return (
      <div className="dashboard-search" data-tour="dashboard-search">
        <input
          placeholder="Search by client, project, tags etc."
          onChange={this.updateQuery.bind(this)}
          value={value} />
        <span className="icon-search" />
      </div>
    );
  }
}

export default Search;
