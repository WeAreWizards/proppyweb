// Base class for all the stores, will set up the rootStore everywhere
export class Store {
  protected rootStore: RootStore;

  constructor(data: any) {
    this.rootStore = data.rootStore;
  }
}

// Imports after the base store to avoid broken cyclic dependencies
import {AnalyticsStore} from "./AnalyticsStore";
import {BillingStore} from "./BillingStore";
import {BlockStore} from "./BlockStore";
import {ClientStore} from "./ClientStore";
import {CommentStore} from "./CommentStore";
import {CompanyStore} from "./CompanyStore";
import {DashboardStore} from "./DashboardStore";
import {EditorStore} from "./EditorStore";
import {ProposalStore} from "./ProposalStore";
import {RouterStore} from "./RouterStore";
import {SharedStore} from "./SharedStore";
import {UIStore} from "./UIStore";
import {UserStore} from "./UserStore";


export class RootStore {
  analyticsStore: AnalyticsStore;
  billingStore: BillingStore;
  blockStore: BlockStore;
  clientStore: ClientStore;
  commentStore: CommentStore;
  companyStore: CompanyStore;
  dashboardStore: DashboardStore;
  editorStore: EditorStore;
  proposalStore: ProposalStore;
  routerStore: RouterStore;
  sharedStore: SharedStore;
  uiStore: UIStore;
  userStore: UserStore;

  constructor() {
    this.analyticsStore = new AnalyticsStore({rootStore: this});
    this.billingStore = new BillingStore({rootStore: this});
    this.blockStore = new BlockStore({rootStore: this});
    this.clientStore = new ClientStore({rootStore: this});
    this.commentStore = new CommentStore({rootStore: this});
    this.companyStore = new CompanyStore({rootStore: this});
    this.dashboardStore = new DashboardStore({rootStore: this});
    this.editorStore = new EditorStore({rootStore: this});
    this.proposalStore = new ProposalStore({rootStore: this});
    this.routerStore = new RouterStore({rootStore: this});
    this.sharedStore = new SharedStore({rootStore: this});
    this.uiStore = new UIStore({rootStore: this});
    this.userStore = new UserStore({rootStore: this});
  }
}

const rootStore = new RootStore();
export default rootStore;
