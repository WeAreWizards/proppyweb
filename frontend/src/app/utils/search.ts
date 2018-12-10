// This is the search module. We roughly follow the gmail
// "KEYWORD:bla" syntax, e.g. "status:bin".
import { observable, ObservableMap } from "mobx";

import { Proposal } from "../stores/models/Proposal";
import { Client } from "../stores/models/Client";
import { SearchTermType } from "../interfaces";

export interface ISearchTerm {
  type: SearchTermType;
  term: string;
}

export class Query {
  @observable public input: string;
  @observable public terms: Array<ISearchTerm>;

  constructor(input = "") {
    this.terms = [];
    this.input = input;
  }
}

export function quote(s: string): string {
  return s.indexOf(" ") === -1 ? s : `"${s}"`;
}

export function unQuote(s: string): string {
  // unquote strings that have quotes on both sides.
  if (s.length > 1 && s[0] === "\"" && s[s.length - 1] === "\"") {
    return s.substr(1, s.length - 2);
  }
  return s;
}

function allTerms(proposal: Proposal, clients: ObservableMap<Client>): string {
  let allTerms = proposal.title;
  if (proposal.clientId && clients.has(proposal.clientId.toString())) {
      allTerms += clients.get(proposal.clientId.toString()).name;
  }
  allTerms += proposal.tags.join("");
  return allTerms.toLocaleLowerCase();
}

function filterTerm(
  proposals: Array<Proposal>,
  clients: ObservableMap<Client>,
  term: ISearchTerm,
  lookingForTrash: boolean,
): Array<Proposal> {
  return proposals.filter(proposal => {
    if (!lookingForTrash && proposal.status === "trash") {
      return false;
    }

    const value = term.term.toLocaleLowerCase();
    if (term.type === SearchTermType.PLAIN) {
      return allTerms(proposal, clients).indexOf(value) !== -1;
    }

    switch (term.type) {
      case SearchTermType.CLIENT:
        // Note that we lowercase when interpreting the search query,
        // not when parsing. This allows us to reproduce the original
        // query from the terms.
        const clientName = proposal.clientId && clients.has(proposal.clientId.toString())
          ? clients.get(proposal.clientId.toString()).name.toLocaleLowerCase()
          : "";
        return clientName === value;
      case SearchTermType.STATUS:
        return proposal.status === value;
      case SearchTermType.TAG:
        return proposal.tags.indexOf(value) > -1;
      default:
        throw new Error("never reached: " + term.toString());
    }
  });
}

export function filterAndRank(proposals: Array<Proposal>, clients: ObservableMap<Client>, query: Query): Array<Proposal> {
  // Special case empty searches: return everything active -> sent + draft
  if (query.terms.length === 0) {
    return proposals.filter(proposal => ["draft", "sent"].indexOf(proposal.status) !== -1);
  }

  const lookingForTrash = query.terms.some(
    term => term.type === SearchTermType.STATUS && term.term === "trash",
  );

  const subsets = query.terms.map(x => filterTerm(proposals, clients, x, lookingForTrash));
  // TODO ranking
  return subsets.reduce((x, y) => x.filter(n => y.indexOf(n) !== -1));
}


export function stringifySearch(searchState: Query): string {
  const stringTerms = searchState.terms.map(x => {
    switch (x.type) {
      case SearchTermType.PLAIN: return x.term;
      case SearchTermType.STATUS: return "status:" + quote(x.term);
      case SearchTermType.CLIENT: return "client:" + quote(x.term);
      case SearchTermType.TAG: return "tag:" + quote(x.term);
      default: throw new Error("unreachable");
    }
  });
  // The space at end is there so users can click on the search field
  // and start typing immediately instead of space, then text.
  return stringTerms.length === 0 ? "" : stringTerms.reduce((x: string, y: string) => x + " " + y) + " ";
}

export function parseSearchString(input: string): Query {
  const q = new Query(input);

  // whitespace outside of quotes
  const match = input.match(/(?:"[^"]+"|[^\s])+/g);

  if (match === null) {
    return q; // Can't parse query, dont' do anything.
  }
  q.terms = match.filter(x => x !== "").map(term => {
    const maybeSplit = term.split(":");
    // plain text
    if (maybeSplit.length === 1) {
      return {type: SearchTermType.PLAIN, term: maybeSplit[0]};
    }
    const type = maybeSplit[0];
    const text = maybeSplit.slice(1).join(":");
    switch (type) {
      case "status":
        return {type: SearchTermType.STATUS, term: unQuote(text)};
      case "tag":
        return {type: SearchTermType.TAG, term: unQuote(text)};
      case "client":
        return {type: SearchTermType.CLIENT, term: unQuote(text)};
      default:
        return {type: SearchTermType.PLAIN, term: type + ":" + text}; // not a known tag
    }
  });

  return q;
}
