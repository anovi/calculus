import type { FunctionCallContext } from './function-args-context';

function buildSignatureEl(ctx: FunctionCallContext): HTMLElement {
  const sig = document.createElement('div');
  sig.className = 'cm-fn-args-tooltip__sig cm-tooltip-section';

  const nameWrapper = document.createElement('div');
  nameWrapper.className = 'cm-fn-args-tooltip__sig-name'

  const fnName = document.createElement('span');
  fnName.className = 'cm-fn-args-tooltip__fn-name';
  fnName.textContent = ctx.fnName;
  nameWrapper.appendChild(fnName);

  const openParen = document.createElement('span');
  openParen.className = 'cm-fn-args-tooltip__sig-punct';
  openParen.textContent = '(';
  nameWrapper.appendChild(openParen);

  for (let i = 0; i < ctx.args.length; i++) {
    if (i > 0) {
      const comma = document.createElement('span');
      comma.className = 'cm-fn-args-tooltip__sig-punct';
      comma.textContent = ', ';
      nameWrapper.appendChild(comma);
    }
    const argEl = document.createElement('span');
    argEl.className = 'cm-fn-args-tooltip__sig-arg';
    if (i === ctx.argIndex) argEl.classList.add('cm-fn-args-tooltip__sig-arg--active');
    argEl.textContent = ctx.args[i].name;
    nameWrapper.appendChild(argEl);
  }

  const closeParen = document.createElement('span');
  closeParen.className = 'cm-fn-args-tooltip__sig-punct';
  closeParen.textContent = ')';
  nameWrapper.appendChild(closeParen);

  sig.appendChild(nameWrapper);
  return sig;
}

export function buildFunctionArgsTooltipDom(ctx: FunctionCallContext): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'cm-fn-args-tooltip';

  const name = buildSignatureEl(ctx);

  /** Function description */
  let fnDoc: HTMLDivElement|undefined = undefined;
  if (ctx.fnDoc) {
    fnDoc = document.createElement('div');
    fnDoc.className = 'cm-fn-args-tooltip__fn-doc cm-tooltip-section';
    fnDoc.textContent = ctx.fnDoc;
    dom.appendChild(fnDoc);
  }

  /** Current Argument Info */
  const current = ctx.args[ctx.argIndex];
  let currentEl: undefined|HTMLDivElement = undefined;
  if (current) {
    currentEl = document.createElement('div');
    currentEl.className = 'cm-fn-args-tooltip__current cm-tooltip-section';
  
    const currentName = document.createElement('span');
    currentName.className = 'cm-fn-args-tooltip__current-name';
    currentName.textContent = current.name;
    currentEl.appendChild(currentName);
  
    if (current.doc) {
      const currentDoc = document.createElement('span');
      currentDoc.className = 'cm-fn-args-tooltip__current-doc';
      currentDoc.textContent = current.doc;
      currentEl.appendChild(currentDoc);
    }
  }

  /** 
   * Arguments lists.
   * 
   * Editor highlights current argument in the tooltip.
   * KEEP IT FOR EXPERIMENTS
   */
  // const list = document.createElement('ul');
  // list.className = 'cm-fn-args-tooltip__list'; //cm-tooltip-section

  // for (let i = 0; i < ctx.args.length; i++) {
  //   const arg = ctx.args[i];
  //   const item = document.createElement('li');
  //   item.className = 'cm-fn-args-tooltip__arg';
  //   if (i === ctx.argIndex) item.classList.add('cm-fn-args-tooltip__arg--active');

  //   const nameEl = document.createElement('span');
  //   nameEl.className = 'cm-fn-args-tooltip__arg-name';
  //   nameEl.textContent = arg.name;
  //   item.appendChild(nameEl);

  //   if (arg.doc) {
  //     const docEl = document.createElement('span');
  //     docEl.className = 'cm-fn-args-tooltip__arg-doc';
  //     docEl.textContent = ': ' + arg.doc;
  //     item.appendChild(docEl);
  //   }

  //   list.appendChild(item);
  // }


  // Apppend all elements
  dom.appendChild(name);
  if (currentEl) dom.appendChild(currentEl);
  if (fnDoc) dom.appendChild(fnDoc);

  return dom;
}
