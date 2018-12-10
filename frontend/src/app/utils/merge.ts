import { Block } from "../stores/models/Block";
import { cloneDeep, union} from "lodash";

enum MergeAction {
  INSERT,
  REMOVE,
  KEEP,
}

interface IMergeItem {
  action: MergeAction;
  version: number;
  block: Block;
  pos: number;
}

type BlockUidMap = { [key: string]: Block; };
type BlockPosMap = { [key: string]: number; };


function blocksToMap(blocks: Array<Block>): BlockUidMap {
  const map: BlockUidMap = {};
  blocks.map(b => {
    // Cloning to make sure we don't affect the current live blocks
    // I don't think it happens but covering every possible angle
    map[b.uid] = cloneDeep(b);
  });
  return map;
}

function blocksPosToMap(blocks: Array<Block>): BlockPosMap {
  const map: BlockPosMap = {};
  blocks.map((b, i) => {
    map[b.uid] = i;
  });
  return map;
}

export function mergeBlocks(common: Array<Block>, local: Array<Block>, server: Array<Block>) {
  // common: the common ancestor (last thing we successfully `put`)
  // local: the current local blocks
  // server: the blocks just retrieved from the server
  const commonMap = blocksToMap(common);
  const serverMap = blocksToMap(server);
  const localMap = blocksToMap(local);

  const commonPos = blocksPosToMap(common);
  const serverPos = blocksPosToMap(server);
  const localPos = blocksPosToMap(local);

  const allUids = union(
    common.map(x => x.uid),
    server.map(x => x.uid),
    local.map(x => x.uid),
  );

  // 3-way merge: determine what to do for every block
  const actions: Array<IMergeItem> = allUids.map(uid => {
    const c = commonMap[uid];
    const l = localMap[uid];
    const s = serverMap[uid];

    // construct a lookup string that's _ if undefined and c, l s otherwise, e.g
    // c_s, c__, cls, etc.
    const lookup = (c === undefined ? "_" : "c") + (l === undefined ? "_" : "l") + (s === undefined ? "_" : "s");

    switch (lookup) {
      case "___": throw new Error("unreachable ___");
      case "__s": return {action: MergeAction.INSERT, version: s.version, block: s, pos: serverPos[uid]}; // added on server
      case "_l_": return {action: MergeAction.INSERT, version: l.version, block: l, pos: localPos[uid]}; // added locally
      case "_ls": throw new Error("unreachable _ls"); // this can only happen on an UUID collision
      case "c__": // removed in both
      case "c_s": // removed locally
      case "cl_": // remove on server
        return {action: MergeAction.REMOVE, version: -1, block: c, pos: -100000};
      case "cls":
        // We need a way of tracking the case where the block moved on
        // the server but we overwrote the content locally. In this case
        // we're currently keeping the local position but what we
        // really want is to use the server position if is newer than
        // the common ancestor, and the common ancestor and the local
        // position are the same.
        if (l.version >= s.version && commonPos[uid] === localPos[uid] && serverPos[uid] !== commonPos[uid]) {
          return {action: MergeAction.KEEP, version: l.version, block: l, pos: serverPos[uid]};
        }

        if (l.version >= s.version) {
          return {action: MergeAction.KEEP, version: l.version, block: l, pos: localPos[uid]};
        }
        return {action: MergeAction.KEEP, version: s.version, block: s, pos: serverPos[uid]};
      default:
        throw new Error("unreachable");
    }
  });

  // Run an operational-transform style algorithm to figure out the
  // correct order for items. E.g. insert at same position pushes
  // later inserts back. That's O(n^2) worst case right now, could
  // make O(n log n) by sorting actions by position as well.
  const sortedActions = actions.sort(
    (a, b) => a.version < b.version ? -1 : (a.version === b.version ? 0 : 1),
  );

  sortedActions.forEach(item => {
    switch (item.action) {
      case MergeAction.INSERT:
        sortedActions.forEach(x => { if (x.pos >= item.pos) { x.pos += 1; }});
        break;
      case MergeAction.REMOVE:
        break; // removing doesn't change relative ordering
      case MergeAction.KEEP:
        break; // keeping position doesn't change relative ordering
      default:
        throw new Error("unreachable");
    }
  });

  // Sort by insert order
  return sortedActions
    .sort((a, b) => a.pos < b.pos ? -1 : (a.pos === b.pos ? 0 : 1))
    .filter(x => x.action !== MergeAction.REMOVE)
    .map(x => x.block);
}
