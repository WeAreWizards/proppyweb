import * as React from "react";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import Cover from "../../proposals/Cover";
import Select from "../../core/select/Select";
import ContentEditable from "../blocks/ContentEditable";
import { Proposal } from "../../../stores/models/Proposal";
import rootStore from "../../../stores/RootStore";
import { prettyIntegrationName } from "../../../utils/integrations";


interface IProposalMetadataProps {
  proposal: Proposal;
}


// check if a variable is a number or not
function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


@observer
export class ProposalMetadata extends React.Component<IProposalMetadataProps, {}> {
  constructor(props) {
    super(props);
    this.state = {clientInput: ""};
  }

  renderTags() {
    const proposal = rootStore.proposalStore.current;
    const tagsToRender = [];
    proposal.tags.map((tag, index) => {
      tagsToRender.push(
        <span className="tag tag--is-removable align-icons" key={index}>
          <span className="icon-close" onClick={() => rootStore.proposalStore.removeTag(tag)}/>
          <span>{tag}</span>
        </span>,
      );
    });

    // don't show the one we already have attached to the proposal
    const tags = rootStore.proposalStore.allTags;
    const options = tags
      .filter(tag => proposal.tags.indexOf(tag) > -1)
      .map(x => ({value: x, label: x}));

    return (
      <div className="editor__tags restrict-width">
        {tagsToRender}
        <Select
          options={options}
          onChange={(value: string) => rootStore.proposalStore.addTag(value.trim())}
          createFn={(value: string) => rootStore.proposalStore.addTag(value.trim())}
          allowCreate={true}
          allowSearch={true}
          createMsg="Create '{label}' tag"
          placeholder="Add a tag" />
      </div>
    );

  }

  setClient(value: string | number) {
    if (!isNumeric(value)) {
      if (value === "") {
        rootStore.proposalStore.setClient(null);
        return;
      }
      rootStore.proposalStore.setClient(value as string);
    } else {
      rootStore.proposalStore.setClient(value as number);
    }
  }

  renderClient() {
    const proposal = rootStore.proposalStore.current;
    const options = rootStore.clientStore.clients.values()
      .map(x => {
        let label = x.name;
        if (x.source !== "") {
          label = `${x.name} (${prettyIntegrationName(x.source)})`;
        }
        return { value: x.id, label };
      });

    return (
      <div className="editor__client align-icons">
        <span className="icon-client"/>
        <Select
          value={proposal.clientId}
          options={options}
          onChange={this.setClient.bind(this)}
          createFn={this.setClient.bind(this)}
          handleRemove={this.setClient.bind(this, "")}
          allowCreate={true}
          allowSearch={true}
          valueAsQuery={true}
          createMsg="Create '{label}' client"
          placeholder="Select a client" />
      </div>
    );
  }

  onTitleChange(event: React.SyntheticEvent<any>) {
    const field = event.target as HTMLInputElement;
    rootStore.proposalStore.rename(field.value);
  }

  render() {
    const { proposal } = this.props;
    const metadataClasses = classnames("editor__metadata", {
      "editor__metadata--has-cover": proposal.coverImageUrl !== "",
    });

    return (
      <div className={metadataClasses}>
        <Cover proposal={proposal} editable />

        <div className="restrict-width">
          <ContentEditable
            id="proposal-title"
            proposalId={proposal.id}
            ceKey="proposal-title"
            tag={"h1"}
            update={(val: string) => rootStore.proposalStore.rename(val)}
            onBackspace={() => {/*noop*/}}
            onEnter={(e) => { e.preventDefault(); }}
            value={proposal.title}
            placeholder="Proposal title"/>

          {this.renderClient()}
          {this.renderTags()}
        </div>
      </div>
    );
  }
}

export default ProposalMetadata;
