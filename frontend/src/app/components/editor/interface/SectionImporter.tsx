import * as React from "react";
import { debounce } from "lodash";
import fetchling from "../../../utils/fetchling";


import Dialog from "../../core/Dialog";
import TextInput from "../../core/forms/TextInput";
import { unescape } from "../../../utils/html";
import rootStore from "../../../stores/RootStore";


interface ISectionImporterDialogProps {
  proposalId: number;
  insertAtUid: string;
  onClose: () => void;
}

interface ISectionImporterDialogState {
  search: string;
  results: Array<any>;
  selected?: number;
  error?: string;
}

export class SectionImporterDialog extends React.Component<ISectionImporterDialogProps, ISectionImporterDialogState> {
  debouncedSearch: any;

  constructor(props) {
    super(props);
    this.state = {error: null, results: [], search: ""};
    this.debouncedSearch = debounce(this.doSearch, 300);
  }

  doSearch(q: string) {
    // Ignore empty searches
    if (q.trim() === "") {
      this.setState({results: [], selected: undefined, search: ""});
      return;
    }

    fetchling(`/proposals/sections/search?id=${this.props.proposalId}&q=${q}`)
      .get().then((response: any) => {
        this.setState({error: null, results: response.results, selected: undefined} as any);
      }).catch(() => {
        this.setState({error: "Could not contact server.", results: [], selected: undefined, search: q});
    });
  }

  renderError() {
    if (this.state.error === null) {
      return null;
    }
    return (<div>Error: {this.state.error}</div>);
  }

  onClick(index, event) {
    event.preventDefault();
    this.setState({selected: index} as any);
  }

  import() {
    const uidToImport = this.state.results[this.state.selected].uid;
    rootStore.blockStore.importSection(this.props.insertAtUid, uidToImport)
      .then(() => this.props.onClose());
  }

  onChange(value: string) {
    this.setState({search: value} as any);
    this.debouncedSearch(value);
  }

  renderResults() {
    if (this.state.error !== null) {
      return null;
    }
    if (this.state.results.length === 0) {
      return <div>No results.</div>;
    }

    const results = this.state.results.map((v: any, i) => {
      return (
        <li key={`result-${i}`}
            onClick={this.onClick.bind(this, i)}
            className={this.state.selected === i ? "selected" : null}>
          <div className="section-importer__results__content">
            <div className="section-importer__results__meta">
              <b>{unescape(v.title)}</b> from <b>{unescape(v.proposalTitle)}</b>
            </div>
            <div className="section-importer__results__summary"
                 dangerouslySetInnerHTML={ {__html: v.summary || "No content"} } />
          </div>
        </li>
      );
    });
    return <ul>{results}</ul>;
  }

  render() {
    const actions = [
      {label: "Import", onClick: this.import.bind(this), disabled: this.state.selected === undefined},
    ];
    return (
      <Dialog title="Import a section" actions={actions} onClose={this.props.onClose}>
        <div className="section-importer">
          <div className="section-importer__search">
            <TextInput
              label="What did you write?"
              name="search"
              onChange={this.onChange.bind(this)}
              value={this.state.search}
              autoFocus={true}
              type="search"/>
            <span className="icon-search" />
          </div>
          <div className="section-importer__results">
            {this.renderError()}
            {this.renderResults()}
          </div>
        </div>
      </Dialog>
    );
  }
}

export default SectionImporterDialog;
