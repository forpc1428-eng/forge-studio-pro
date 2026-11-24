import { useStore } from '../store.js';

export function contextItems() {
  const s = useStore.getState();
  const has = s.selection.length > 0;
  const nodes = s.selectedNodes();
  const isFrame = nodes.length === 1 && nodes[0].children;
  return [
    { label: 'Copy', icon: 'Copy', kbd: 'Ctrl C', run: s.copy, disabled: !has },
    { label: 'Cut', icon: 'Scissors', kbd: 'Ctrl X', run: s.cut, disabled: !has },
    { label: 'Paste', icon: 'ClipboardPaste', kbd: 'Ctrl V', run: s.paste, disabled: !s.clipboard },
    { label: 'Duplicate', icon: 'CopyPlus', kbd: 'Ctrl D', run: s.duplicate, disabled: !has },
    '-',
    { label: 'Group selection', icon: 'Group', kbd: 'Ctrl G', run: s.group, disabled: !has },
    { label: 'Ungroup', icon: 'Ungroup', kbd: 'Ctrl ⇧ G', run: s.ungroup, disabled: !isFrame },
    { label: 'Add auto layout', icon: 'Rows3', kbd: '⇧ A', run: () => { if (isFrame) s.updateSel((n) => { n.layout.mode = 'column'; }); else { s.group(); useStore.getState().updateSel((n) => { n.layout.mode = 'column'; n.sizeW = 'hug'; n.sizeH = 'hug'; }); } }, disabled: !has },
    { label: 'Create component…', icon: 'Component', kbd: 'Ctrl ⌥ K', run: () => s.set({ modal: 'component' }), disabled: !has },
    '-',
    { label: 'Bring to front', icon: 'BringToFront', kbd: ']', run: () => s.arrange('front'), disabled: !has },
    { label: 'Bring forward', icon: 'ArrowUp', kbd: 'Ctrl ]', run: () => s.arrange('forward'), disabled: !has },
    { label: 'Send backward', icon: 'ArrowDown', kbd: 'Ctrl [', run: () => s.arrange('backward'), disabled: !has },
    { label: 'Send to back', icon: 'SendToBack', kbd: '[', run: () => s.arrange('back'), disabled: !has },
    '-',
    { label: 'Show code', icon: 'Code', kbd: 'Ctrl E', run: () => s.set({ modal: 'code' }), disabled: !has },
    { label: 'Edit as JSON', icon: 'Braces', run: () => s.set({ modal: 'json' }), disabled: nodes.length !== 1 },
    { label: nodes[0]?.locked ? 'Unlock' : 'Lock', icon: 'Lock', kbd: 'Ctrl ⇧ L', run: () => s.updateSel((n) => { n.locked = !n.locked; }), disabled: !has },
    { label: 'Hide', icon: 'EyeOff', kbd: 'Ctrl ⇧ H', run: () => s.updateSel((n) => { n.visible = false; }), disabled: !has },
    { label: 'Delete', icon: 'Trash2', kbd: 'Del', run: () => s.remove(), disabled: !has, danger: true },
  ];
}
